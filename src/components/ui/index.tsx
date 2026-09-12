import {
  Children,
  cloneElement,
  createContext,
  forwardRef,
  isValidElement,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ButtonHTMLAttributes,
  type ReactElement,
  type RefAttributes,
} from 'react';
import { createPortal } from 'react-dom';
import { CalendarDays, ChevronDown } from 'lucide-react';
import { cn } from '../../lib/utils';

type AnyProps = Record<string, any>;
type TextFieldProps = AnyProps;

// `placeholder || 'Selecione'` treats an intentionally empty string (passed by
// FloatingSelect/FloatingMultiSelect to suppress the placeholder so their own
// floating label can occupy that space) the same as "no placeholder given" —
// both are falsy — so it always fell back to 'Selecione', permanently
// overlapping the floating label. Only fall back when placeholder is undefined.
function resolvePlaceholder(placeholder: any) {
  return placeholder === undefined ? 'Selecione' : placeholder;
}
type NumberFieldProps = AnyProps;
type SelectFieldProps = AnyProps;
type MultiSelectFieldProps = AnyProps;
type DateFieldProps = AnyProps;
type CheckboxFieldProps = AnyProps;
type RefComponent<Props, Element extends HTMLElement> = (props: Props & RefAttributes<Element>) => ReactElement | null;

const STYLE_MAP: Record<string, keyof CSSProperties> = {
  m: 'margin', mt: 'marginTop', mr: 'marginRight', mb: 'marginBottom', ml: 'marginLeft',
  mx: 'marginInline', my: 'marginBlock', p: 'padding', pt: 'paddingTop', pr: 'paddingRight',
  pb: 'paddingBottom', pl: 'paddingLeft', px: 'paddingInline', py: 'paddingBlock',
  w: 'width', h: 'height', maw: 'maxWidth', miw: 'minWidth',
};

const UI_PROPS = new Set([
  'align', 'autoContrast', 'bg', 'bold', 'border', 'bottom', 'c', 'centered', 'color', 'cols', 'component', 'data',
  'description', 'dimmed', 'direction', 'display', 'error', 'fw', 'fullWidth', 'gap', 'h', 'hiddenFrom', 'visibleFrom', 'href',
  'in', 'indeterminate', 'inherit', 'label', 'leftSection', 'lh', 'light', 'loading', 'maw', 'maxWidth', 'mb', 'menu',
  'mh', 'miw', 'min', 'minRows', 'ml', 'modal', 'modifiers', 'mr', 'mt', 'mx', 'my', 'name', 'order', 'orientation',
  'opened', 'p', 'padding', 'pb', 'pe', 'pl', 'position', 'pr', 'pt', 'px', 'py', 'radius', 'readOnly', 'rightSection',
  'shadow', 'size', 'spacing', 'span', 'sx', 'styles', 'ta', 'title', 'to', 'truncate', 'tt', 'variant', 'value', 'w',
  'withAsterisk', 'wrap', 'zIndex', 'withinPortal', 'onClose', 'onChange', 'onValueChange', 'onOpen', 'onClose',
  'transitionProps', 'transitionDuration', 'closeOnClickOutside', 'closeOnEscape', 'withArrow', 'shadow', 'positionDependencies',
  'withBorder', 'offsetScrollbars', 'horizontalSpacing', 'verticalSpacing', 'lineClamp', 'clearable', 'grow', 'scrollAreaComponent',
  'labelProps', 'searchable', 'nothingFoundMessage', 'valueFormat', 'multiple', 'autosize', 'minRows', 'maxRows', 'maxLength', 'length', 'accept', 'onLabel', 'offLabel',
  'highlightOnHover', 'withCloseButton', 'striped', 'withColumnBorders', 'stickyHeader', 'stickyHeaderOffset', 'allowDeselect', 'circle',
]);

const SPACING_SCALE: Record<string, string> = {
  xs: '.625rem',
  sm: '.75rem',
  md: '1rem',
  lg: '1.25rem',
  xl: '2rem',
};

function spacing(value: any) {
  if (typeof value === 'number') return `${value * 4}px`;
  if (typeof value === 'string') return SPACING_SCALE[value] ?? value;
  return undefined;
}

// Dimension props (w/h/maw/miw) take raw pixel values in Mantine, unlike spacing
// props (m/p and variants) which use the 4px-multiple spacing scale. Do not merge
// this with spacing() — that previously rendered every numeric w/h 4x too large.
function dimension(value: any) {
  if (typeof value === 'number') return `${value}px`;
  if (typeof value === 'string') return value;
  return undefined;
}

const DIMENSION_PROPS = new Set(['w', 'h', 'maw', 'miw']);

// Mantine semantic color names (used everywhere as `c="blue"`, `c="red"`, etc.)
// must resolve to the same theme-aware --ui-hue-* tokens used by badges/accents,
// not the raw CSS named color of the same name. "blue" as a literal CSS color is
// a near-black #0000FF with terrible contrast on this app's dark surfaces; the
// --ui-hue-* custom properties are redefined per theme specifically to avoid that.
const HUE_COLOR_NAMES = new Set([
  'gray', 'red', 'pink', 'orange', 'yellow', 'green', 'teal', 'cyan',
  'blue', 'indigo', 'violet', 'grape', 'dark',
]);

// The `c` (text color) prop is a free-form Mantine shorthand: "dimmed" (handled
// separately via a class, see classForText), a semantic hue name ("blue", "red",
// ...) mapped to --ui-hue-*, a CSS color ("white", "#fff", "var(--x)"), or a
// dotted theme token ("gray.0") this compat layer doesn't model. Only forward
// values that are valid standalone CSS colors; unmapped tokens are dropped
// rather than emitted as broken inline styles.
function textColor(value: any) {
  if (typeof value !== 'string' || value === 'dimmed' || value.includes('.')) return undefined;
  if (HUE_COLOR_NAMES.has(value)) return `var(--ui-hue-${value})`;
  return value;
}

function cleanProps(props: AnyProps, extra: string[] = []) {
  const styleProps = ['m', 'mt', 'mr', 'mb', 'ml', 'mx', 'my', 'p', 'pt', 'pr', 'pb', 'pl', 'px', 'py', 'w', 'h', 'maw', 'miw'];
  // 'style' is handled below (merged into the returned `style` object) and must
  // never land in domProps — components spread {...domProps} after their own
  // `style={style}` attribute, so a raw `props.style` in domProps would silently
  // clobber every m/p/w/h computed above whenever a caller passes both an
  // explicit `style` prop and a spacing prop together.
  const omitted = new Set([...UI_PROPS, ...styleProps, ...extra, 'style']);
  const domProps: AnyProps = {};
  Object.entries(props).forEach(([key, value]) => {
    if (!omitted.has(key)) domProps[key] = value;
  });
  const style: CSSProperties = { ...((props.style as CSSProperties | undefined) || {}) };
  for (const key of styleProps) {
    const cssKey = STYLE_MAP[key];
    if (!cssKey) continue;
    if (props[key] !== undefined) {
      style[cssKey as keyof CSSProperties] = (DIMENSION_PROPS.has(key) ? dimension(props[key]) : spacing(props[key])) as never;
    }
  }
  if (props.c !== undefined) {
    const resolved = textColor(props.c);
    if (resolved) style.color = resolved;
  }
  if (props.lineClamp) {
    style.display = '-webkit-box';
    (style as AnyProps).WebkitBoxOrient = 'vertical';
    (style as AnyProps).WebkitLineClamp = props.lineClamp;
    style.overflow = 'hidden';
  }
  if (props.sx && typeof props.sx === 'object') Object.assign(style, props.sx as object);
  return { domProps, style };
}

// `hiddenFrom`/`visibleFrom` are Mantine's responsive show/hide props (a
// breakpoint keyword: xs/sm/md/lg/xl). Neither did anything in this shim —
// `hiddenFrom` was silently swallowed by UI_PROPS and `visibleFrom` wasn't
// even recognized, so both branches of a "mobile buttons vs desktop icons"
// pair rendered at once on every screen size. The CSS pairs a breakpoint
// class with the component's own base class (`.ui-stack`, `.ui-primitive`,
// `.ui-surface`, `.ui-card`) so hiding one still lets the other's natural
// `display` (flex for Stack, block for the rest) come back correctly.
function responsiveVisibilityClass(props: AnyProps) {
  const classes: string[] = [];
  if (props.hiddenFrom) classes.push(`ui-hidden-from-${props.hiddenFrom}`);
  if (props.visibleFrom) classes.push(`ui-visible-from-${props.visibleFrom}`);
  return classes.length ? classes.join(' ') : undefined;
}

function classForText(props: AnyProps) {
  const classes = ['ui-text'];
  if (props.dimmed || props.c === 'dimmed') classes.push('ui-text-muted');
  if (props.truncate) classes.push('ui-text-truncate');
  if (props.fw) classes.push(`ui-fw-${props.fw}`);
  if (props.ta) classes.push(`ui-text-${props.ta}`);
  return classes.join(' ');
}

function resolveTag(component: any, fallback: any) {
  if (typeof component === 'string') return component;
  return fallback;
}

const Primitive = forwardRef<HTMLElement, AnyProps>(function Primitive({ children, className, ...props }, ref) {
  const tag = resolveTag(props.component, 'div');
  const { domProps, style } = cleanProps(props);
  const Element = tag as any;
  return <Element ref={ref} className={cn('ui-primitive', responsiveVisibilityClass(props), className)} style={style} {...domProps}>{children}</Element>;
});

export const Box = Primitive;
export const Paper = forwardRef<HTMLDivElement, AnyProps>((props, ref) => <Primitive ref={ref} {...props} className={cn('ui-surface', props.className)} />);
export const Card = forwardRef<HTMLDivElement, AnyProps>((props, ref) => <Primitive ref={ref} {...props} className={cn('ui-card', props.className)} />);
// `wrap` mirrors Mantine's Group API: a CSS flex-wrap keyword string
// ("wrap" | "nowrap" | "wrap-reverse"), not a boolean. A naive truthy check
// (`wrap ? 'wrap' : undefined`) treated the string "nowrap" as truthy and
// forced wrapping — exactly backwards from every `wrap="nowrap"` call site.
function resolveFlexWrap(wrap: any) {
  if (wrap === undefined) return undefined;
  if (typeof wrap === 'boolean') return wrap ? 'wrap' : 'nowrap';
  return wrap;
}

function resolveGap(gap: any) {
  if (typeof gap === 'number') return { className: undefined, style: { gap: `${gap}px` } };
  return { className: `ui-gap-${gap}`, style: undefined };
}
export const Group = forwardRef<HTMLDivElement, AnyProps>(({ children, className, align = 'center', justify, gap = 'md', wrap, ...props }, ref) => {
  const cleaned = cleanProps(props);
  const resolvedGap = resolveGap(gap);
  return <div ref={ref} className={cn('ui-group', resolvedGap.className, responsiveVisibilityClass(props), className)} style={{ alignItems: align, justifyContent: justify, flexWrap: resolveFlexWrap(wrap), ...resolvedGap.style, ...cleaned.style }} {...cleaned.domProps}>{children}</div>;
});
export const Stack = forwardRef<HTMLDivElement, AnyProps>(({ children, className, align, justify, gap = 'md', ...props }, ref) => {
  const cleaned = cleanProps(props);
  const resolvedGap = resolveGap(gap);
  return <div ref={ref} className={cn('ui-stack', resolvedGap.className, responsiveVisibilityClass(props), className)} style={{ alignItems: align, justifyContent: justify, ...resolvedGap.style, ...cleaned.style }} {...cleaned.domProps}>{children}</div>;
});
export const Flex = Group;
export const Center = forwardRef<HTMLDivElement, AnyProps>(({ children, className, ...props }, ref) => <Group ref={ref} {...props} className={cn('ui-center', className)}>{children}</Group>);
export const Container = forwardRef<HTMLDivElement, AnyProps>(({ children, className, ...props }, ref) => <Primitive ref={ref} {...props} className={cn('ui-container', className)}>{children}</Primitive>);
export const SimpleGrid = forwardRef<HTMLDivElement, AnyProps>(({ children, className, cols = 1, spacing: gap = 'md', ...props }, ref) => {
  const breakpoints: AnyProps = typeof cols === 'number' ? { base: cols } : (cols || { base: 1 });
  const colsVars: AnyProps = {};
  for (const key of ['base', 'xs', 'sm', 'md', 'lg', 'xl']) {
    if (breakpoints[key] !== undefined) colsVars[`--sg-cols-${key}`] = breakpoints[key];
  }
  const resolvedGap = resolveGap(gap);
  return <Primitive ref={ref} {...props} className={cn('ui-simple-grid', resolvedGap.className, className)} style={{ ...colsVars, ...resolvedGap.style, ...(props.style || {}) }}>{children}</Primitive>;
});

export const Grid: any = forwardRef<HTMLDivElement, AnyProps>(({ children, className, gutter = 'md', ...props }, ref) => {
  const resolvedGap = resolveGap(gutter);
  return <Primitive ref={ref} {...props} className={cn('ui-grid', resolvedGap.className, className)} style={{ gridTemplateColumns: 'repeat(12, minmax(0, 1fr))', ...resolvedGap.style, ...(props.style || {}) }}>{children}</Primitive>;
});
Grid.Col = ({ children, span = 12, className, ...props }: AnyProps) => <Primitive {...props} className={cn('ui-grid-col', className)} style={{ gridColumn: typeof span === 'number' ? `span ${Math.min(span, 12)} / span ${Math.min(span, 12)}` : undefined, ...(props.style || {}) }}>{children}</Primitive>;

export const Text = forwardRef<HTMLElement, AnyProps>(({ children, className, component, span, ...props }, ref) => {
  const Element = resolveTag(component || (span ? 'span' : 'p'), 'p') as any;
  const cleaned = cleanProps(props);
  return <Element ref={ref} className={cn(classForText(props), className)} style={cleaned.style} {...cleaned.domProps}>{children}</Element>;
});
export const Title = forwardRef<HTMLHeadingElement, AnyProps>(({ children, order = 2, className, ...props }, ref) => {
  const Element = `h${Math.min(6, Math.max(1, order))}` as any;
  const cleaned = cleanProps(props);
  return <Element ref={ref} className={cn('ui-title', props.c === 'dimmed' && 'ui-text-muted', className)} style={cleaned.style} {...cleaned.domProps}>{children}</Element>;
});
export const Anchor = forwardRef<HTMLAnchorElement, AnyProps>(({ children, className, ...props }, ref) => <a ref={ref} className={cn('ui-anchor', className)} {...cleanProps(props).domProps}>{children}</a>);

const BUTTON_DEFAULT_COLORS = new Set(['blue', 'darkBlue', 'primary', undefined]);

export const Button = forwardRef<HTMLButtonElement, AnyProps>(function Button({ children, leftSection, rightSection, loading, fullWidth, className, ...props }, ref) {
  const cleaned = cleanProps(props);
  const colorClass = !BUTTON_DEFAULT_COLORS.has(props.color) ? `ui-button-color-${props.color}` : null;
  return <button ref={ref} type={props.type || 'button'} className={cn('ui-button', `ui-button-${props.variant || 'filled'}`, `ui-button-${props.size || 'md'}`, colorClass, fullWidth && 'ui-button-full', className)} disabled={props.disabled || loading} style={cleaned.style} {...cleaned.domProps}>{loading && <Loader size="sm" />}{!loading && leftSection}<span>{children || props.label}</span>{!loading && rightSection}</button>;
});
export const ActionIcon = forwardRef<HTMLButtonElement, AnyProps>(({ children, className, ...props }, ref) => <Button ref={ref} {...props} className={cn('ui-action-icon', className)} aria-label={props['aria-label'] || props.title}>{children}</Button>);
export const UnstyledButton = forwardRef<HTMLButtonElement, ButtonHTMLAttributes<HTMLButtonElement>>(({ children, className, ...props }, ref) => <button ref={ref} type="button" className={cn('ui-unstyled-button', className)} {...props}>{children}</button>);

function Field({ label, description, error, withAsterisk, children, className }: AnyProps) {
  return <label className={cn('ui-field', className)}>{label && <span className="ui-field-label">{label}{withAsterisk && <b aria-hidden="true"> *</b>}</span>}{children}{description && <span className="ui-field-description">{description}</span>}{error && <span className="ui-field-error">{typeof error === 'string' ? error : 'Campo inválido'}</span>}</label>;
}

function inputClass(className?: string) { return cn('ui-input', className); }
const TextInputPrimitive = forwardRef<HTMLInputElement, AnyProps>(({ label, description, error, leftSection, rightSection, withAsterisk, className, value, onChange, readOnly, ...props }, ref) => <Field label={label} description={description} error={error} withAsterisk={withAsterisk} className={className}><span className="ui-input-wrap">{leftSection}<input ref={ref} className={inputClass()} value={value} onChange={onChange} readOnly={readOnly} {...cleanProps(props).domProps} />{rightSection}</span></Field>);
export const TextInput = TextInputPrimitive as unknown as RefComponent<TextFieldProps, HTMLInputElement>;
export const PasswordInput = TextInput;
const NumberInputPrimitive = forwardRef<HTMLInputElement, AnyProps>(({ label, description, error, value, onChange, ...props }, ref) => <Field label={label} description={description} error={error}><input ref={ref} type="number" className={inputClass()} value={value ?? ''} onChange={(event) => onChange?.(event.currentTarget.value === '' ? '' : Number(event.currentTarget.value))} {...cleanProps(props).domProps} /></Field>);
export const NumberInput = NumberInputPrimitive as unknown as RefComponent<NumberFieldProps, HTMLInputElement>;
const TextareaPrimitive = forwardRef<HTMLTextAreaElement, AnyProps>(({ label, description, error, withAsterisk, className, value, onChange, ...props }, ref) => <Field label={label} description={description} error={error} withAsterisk={withAsterisk} className={className}><textarea ref={ref} className={inputClass()} value={value} onChange={onChange} {...cleanProps(props).domProps} /></Field>);
export const Textarea: RefComponent<TextFieldProps, HTMLTextAreaElement> & { Autosize: RefComponent<TextFieldProps, HTMLTextAreaElement> } = Object.assign(TextareaPrimitive as unknown as RefComponent<TextFieldProps, HTMLTextAreaElement>, { Autosize: TextareaPrimitive as unknown as RefComponent<TextFieldProps, HTMLTextAreaElement> });
export const ColorInput = forwardRef<HTMLInputElement, AnyProps>(({ label, ...props }, ref) => <Field label={label}><input ref={ref} type="color" className={inputClass()} {...cleanProps(props).domProps} /></Field>);
const FileInputPrimitive = forwardRef<HTMLInputElement, AnyProps>(({ label, onChange, ...props }, ref) => <Field label={label}><input ref={ref} type="file" className={inputClass()} onChange={(event) => onChange?.(event.currentTarget.files?.[0] || null)} {...cleanProps(props).domProps} /></Field>);
export const FileInput = FileInputPrimitive as unknown as RefComponent<AnyProps, HTMLInputElement>;
export const PinInput = forwardRef<HTMLInputElement, AnyProps>((props, ref) => <input ref={ref} inputMode="numeric" maxLength={props.length} className={inputClass()} {...cleanProps(props).domProps} />);

function normalizeOptions(data: any[] = []) { return data.map((item) => typeof item === 'string' ? { value: item, label: item } : { value: String(item.value), label: item.label ?? item.value, disabled: item.disabled }); }

const SelectPrimitive = forwardRef<HTMLButtonElement, AnyProps>(function SelectPrimitive({
  label,
  description,
  error,
  data = [],
  placeholder,
  value,
  onChange,
  leftSection,
  rightSection,
  withAsterisk,
  className,
  clearable,
  searchable,
  disabled,
  readOnly,
  id,
  name,
  required,
  ...props
}, ref) {
  const rootRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const [opened, setOpened] = useState(false);
  const [search, setSearch] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const options = normalizeOptions(data);
  const selectedValue = value === null || value === undefined ? '' : String(value);
  const selectedOption = options.find((option) => option.value === selectedValue);
  const filteredOptions = options.filter((option) => String(option.label).toLowerCase().includes(search.trim().toLowerCase()));
  const isDisabled = Boolean(disabled || readOnly);

  useEffect(() => {
    if (!opened) return undefined;
    const closeOnOutsideClick = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpened(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpened(false);
    };
    document.addEventListener('mousedown', closeOnOutsideClick);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('mousedown', closeOnOutsideClick);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [opened]);

  useEffect(() => {
    if (opened && searchable) searchRef.current?.focus();
  }, [opened, searchable]);

  const openMenu = () => {
    if (isDisabled) return;
    setSearch('');
    const selectedIndex = options.findIndex((option) => option.value === selectedValue && !option.disabled);
    setHighlightedIndex(selectedIndex >= 0 ? selectedIndex : 0);
    setOpened(true);
  };

  const selectOption = (option: AnyProps) => {
    if (option.disabled) return;
    setOpened(false);
    setSearch('');
    onChange?.(option.value || null);
  };

  const moveHighlight = (direction: 1 | -1) => {
    if (!filteredOptions.length) return;
    let nextIndex = highlightedIndex;
    for (let step = 0; step < filteredOptions.length; step += 1) {
      nextIndex = (nextIndex + direction + filteredOptions.length) % filteredOptions.length;
      if (!filteredOptions[nextIndex].disabled) {
        setHighlightedIndex(nextIndex);
        return;
      }
    }
  };

  const handleKeyDown = (event: any) => {
    if (isDisabled) return;
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      if (!opened) openMenu();
      else moveHighlight(1);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      if (!opened) openMenu();
      else moveHighlight(-1);
    } else if ((event.key === 'Enter' || event.key === ' ') && !opened) {
      event.preventDefault();
      openMenu();
    } else if (event.key === 'Enter' && opened) {
      event.preventDefault();
      const option = filteredOptions[highlightedIndex];
      if (option) selectOption(option);
    }
  };

  const cleaned = cleanProps(props);
  return (
    <Field label={label} description={description} error={error} withAsterisk={withAsterisk} className={className}>
      <div ref={rootRef} className={cn('ui-select', opened && 'ui-select-open')}>
        <button
          ref={ref}
          id={id}
          name={name}
          type="button"
          className={cn('ui-input', 'ui-select-trigger', !selectedOption && 'ui-select-placeholder')}
          aria-haspopup="listbox"
          aria-expanded={opened}
          aria-required={Boolean(required || withAsterisk)}
          aria-invalid={Boolean(error)}
          disabled={isDisabled}
          onClick={() => (opened ? setOpened(false) : openMenu())}
          onKeyDown={handleKeyDown}
          {...cleaned.domProps}
        >
          {leftSection}
          <span className="ui-select-value">{selectedOption?.label || resolvePlaceholder(placeholder)}</span>
          {rightSection || <span className="ui-select-chevron" aria-hidden="true" />}
        </button>
        {clearable && selectedOption && !isDisabled && (
          <button
            type="button"
            className="ui-select-clear"
            aria-label="Limpar seleção"
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => { onChange?.(null); setOpened(false); }}
          >×</button>
        )}
        {opened && (
          <div className="ui-select-popover" role="listbox" aria-label={label || 'Opções'}>
            {searchable && (
              <input
                ref={searchRef}
                className="ui-select-search"
                value={search}
                onChange={(event) => { setSearch(event.currentTarget.value); setHighlightedIndex(0); }}
                onKeyDown={(event) => {
                  if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
                    event.preventDefault();
                    moveHighlight(event.key === 'ArrowDown' ? 1 : -1);
                  } else if (event.key === 'Enter') {
                    event.preventDefault();
                    const option = filteredOptions[highlightedIndex];
                    if (option) selectOption(option);
                  }
                }}
                placeholder="Buscar..."
                aria-label="Buscar opções"
              />
            )}
            <div className="ui-select-options">
              {(placeholder || clearable) && !search && (
                <button type="button" className={cn('ui-select-option', !selectedValue && 'ui-select-option-selected')} role="option" aria-selected={!selectedValue} onMouseDown={(event) => { event.preventDefault(); selectOption({ value: '', label: resolvePlaceholder(placeholder) }); }} onClick={(event) => event.preventDefault()}>
                  {resolvePlaceholder(placeholder)}
                </button>
              )}
              {filteredOptions.map((option, index) => (
                <button
                  type="button"
                  key={`${option.value}-${index}`}
                  className={cn('ui-select-option', option.disabled && 'ui-select-option-disabled', option.value === selectedValue && 'ui-select-option-selected', index === highlightedIndex && 'ui-select-option-highlighted')}
                  role="option"
                  aria-selected={option.value === selectedValue}
                  disabled={option.disabled}
                  onMouseDown={(event) => { event.preventDefault(); selectOption(option); }}
                  onClick={(event) => event.preventDefault()}
                >
                  <span>{option.label}</span>
                  {option.value === selectedValue && <span className="ui-select-check" aria-hidden="true">✓</span>}
                </button>
              ))}
              {!filteredOptions.length && <span className="ui-select-empty">Nenhuma opção encontrada</span>}
            </div>
          </div>
        )}
      </div>
    </Field>
  );
});
export const Select = SelectPrimitive as unknown as RefComponent<SelectFieldProps, HTMLButtonElement>;

const NativeSelectPrimitive = forwardRef<HTMLSelectElement, AnyProps>(({ label, description, error, data = [], placeholder, value, onChange, leftSection, withAsterisk, className, clearable, ...props }, ref) => <Field label={label} description={description} error={error} withAsterisk={withAsterisk} className={className}><span className="ui-input-wrap">{leftSection}<select ref={ref} className={inputClass()} value={value ?? ''} onChange={(event) => onChange?.(event.currentTarget.value || null)} {...cleanProps(props).domProps}>{(placeholder !== undefined || clearable) && <option value="">{resolvePlaceholder(placeholder)}</option>}{normalizeOptions(data).map((item) => <option key={item.value} value={item.value} disabled={item.disabled}>{item.label}</option>)}</select></span></Field>);
export const NativeSelect = NativeSelectPrimitive;
const MultiSelectPrimitive = forwardRef<HTMLButtonElement, AnyProps>(function MultiSelectPrimitive({
  label,
  description,
  error,
  data = [],
  value = [],
  onChange,
  className,
  placeholder,
  searchable,
  clearable,
  disabled,
  readOnly,
  id,
  name,
  required,
  withAsterisk,
  ...props
}, ref) {
  const rootRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const [opened, setOpened] = useState(false);
  const [search, setSearch] = useState('');
  const options = normalizeOptions(data);
  const selectedValues = Array.isArray(value) ? value.map((item: any) => String(item)) : [];
  const selectedOptions = options.filter((option) => selectedValues.includes(option.value));
  const filteredOptions = options.filter((option) => String(option.label).toLowerCase().includes(search.trim().toLowerCase()));
  const isDisabled = Boolean(disabled || readOnly);

  useEffect(() => {
    if (!opened) return undefined;
    const closeOnOutsideClick = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpened(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpened(false);
    };
    document.addEventListener('mousedown', closeOnOutsideClick);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('mousedown', closeOnOutsideClick);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [opened]);

  useEffect(() => {
    if (opened && searchable) searchRef.current?.focus();
  }, [opened, searchable]);

  const toggleOption = (option: AnyProps) => {
    if (option.disabled || isDisabled) return;
    const nextValues = selectedValues.includes(option.value)
      ? selectedValues.filter((selectedValue) => selectedValue !== option.value)
      : [...selectedValues, option.value];
    onChange?.(nextValues);
  };

  const cleaned = cleanProps(props);
  return (
    <Field label={label} description={description} error={error} withAsterisk={withAsterisk} className={className}>
      <div ref={rootRef} className={cn('ui-multi-select', opened && 'ui-multi-select-open')}>
        <button
          ref={ref}
          id={id}
          name={name}
          type="button"
          className={cn('ui-input', 'ui-multi-select-trigger', selectedOptions.length === 0 && 'ui-multi-select-placeholder')}
          aria-haspopup="listbox"
          aria-expanded={opened}
          aria-required={Boolean(required || withAsterisk)}
          aria-invalid={Boolean(error)}
          disabled={isDisabled}
          onClick={() => setOpened((current) => !current)}
          {...cleaned.domProps}
        >
          <span className="ui-multi-select-values">
            {selectedOptions.slice(0, 2).map((option) => <span className="ui-multi-select-chip" key={option.value}>{option.label}</span>)}
            {selectedOptions.length > 2 && <span className="ui-multi-select-more">+{selectedOptions.length - 2}</span>}
            {selectedOptions.length === 0 && <span>{resolvePlaceholder(placeholder)}</span>}
          </span>
          <span className="ui-select-chevron" aria-hidden="true" />
        </button>
        {clearable && selectedOptions.length > 0 && !isDisabled && (
          <button type="button" className="ui-select-clear" aria-label="Limpar seleções" onMouseDown={(event) => event.preventDefault()} onClick={() => onChange?.([])}>×</button>
        )}
        {opened && (
          <div className="ui-select-popover ui-multi-select-popover" role="listbox" aria-label={label || 'Opções'} aria-multiselectable="true">
            {searchable && (
              <input ref={searchRef} className="ui-select-search" value={search} onChange={(event) => setSearch(event.currentTarget.value)} placeholder="Buscar..." aria-label="Buscar opções" />
            )}
            <div className="ui-select-options">
              {filteredOptions.map((option) => {
                const selected = selectedValues.includes(option.value);
                return (
                  <button type="button" key={option.value} className={cn('ui-select-option', selected && 'ui-select-option-selected', option.disabled && 'ui-select-option-disabled')} role="option" aria-selected={selected} disabled={option.disabled} onMouseDown={(event) => event.preventDefault()} onClick={() => toggleOption(option)}>
                    <span>{option.label}</span>
                    {selected && <span className="ui-select-check" aria-hidden="true">✓</span>}
                  </button>
                );
              })}
              {!filteredOptions.length && <span className="ui-select-empty">Nenhuma opção encontrada</span>}
            </div>
          </div>
        )}
      </div>
    </Field>
  );
});
export const MultiSelect = MultiSelectPrimitive as unknown as RefComponent<MultiSelectFieldProps, HTMLButtonElement>;

// `TagsInput` used to be a bare alias for `MultiSelect` — but Mantine's
// TagsInput lets the user type arbitrary free text and press Enter to create
// a brand-new value, whereas MultiSelect can only toggle values that already
// exist in its `data` list. Any call site passing no `data` (the common case,
// e.g. "type a strategy and press Enter") rendered a dropdown *button* with
// zero selectable options and no way to type at all — the field was
// completely inert. This is a real text input that turns Enter/comma into a
// new chip, with existing chips removable individually.
const TagsInputPrimitive = forwardRef<HTMLInputElement, AnyProps>(function TagsInputPrimitive({
  label,
  description,
  error,
  value = [],
  onChange,
  placeholder,
  clearable,
  disabled,
  readOnly,
  id,
  name,
  required,
  withAsterisk,
  className,
  ...props
}, ref) {
  const [draft, setDraft] = useState('');
  const tags: string[] = Array.isArray(value) ? value.map((item: any) => String(item)) : [];
  const isDisabled = Boolean(disabled || readOnly);

  const commitDraft = () => {
    const next = draft.trim();
    setDraft('');
    if (!next || tags.includes(next)) return;
    onChange?.([...tags, next]);
  };
  const removeTag = (tag: string) => onChange?.(tags.filter((item) => item !== tag));

  const cleaned = cleanProps(props);
  return (
    <Field label={label} description={description} error={error} withAsterisk={withAsterisk} className={className}>
      <div className={cn('ui-input', 'ui-tags-input')}>
        {tags.map((tag) => (
          <span className="ui-tags-input-chip" key={tag}>
            {tag}
            {!isDisabled && (
              <button type="button" className="ui-tags-input-remove" aria-label={`Remover ${tag}`} onMouseDown={(event) => event.preventDefault()} onClick={() => removeTag(tag)}>×</button>
            )}
          </span>
        ))}
        <input
          ref={ref}
          id={id}
          name={name}
          className="ui-tags-input-field"
          value={draft}
          placeholder={tags.length === 0 ? resolvePlaceholder(placeholder) : ''}
          disabled={isDisabled}
          aria-required={Boolean(required || withAsterisk)}
          aria-invalid={Boolean(error)}
          onChange={(event) => setDraft(event.currentTarget.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ',') {
              event.preventDefault();
              commitDraft();
            } else if (event.key === 'Backspace' && !draft && tags.length > 0) {
              removeTag(tags[tags.length - 1]);
            }
          }}
          onBlur={commitDraft}
          {...cleaned.domProps}
        />
        {clearable && tags.length > 0 && !isDisabled && (
          <button type="button" className="ui-select-clear" aria-label="Limpar tags" onMouseDown={(event) => event.preventDefault()} onClick={() => onChange?.([])}>×</button>
        )}
      </div>
    </Field>
  );
});
export const TagsInput = TagsInputPrimitive as unknown as RefComponent<TextFieldProps, HTMLInputElement>;
function toDateInputValue(value: unknown) {
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? '' : value.toISOString().slice(0, 10);
  if (typeof value === 'string') return value.slice(0, 10);
  return '';
}
const NativeDateInput = forwardRef<HTMLInputElement, AnyProps>(({ value, onChange, ...props }, ref) => <input ref={ref} type="date" className={inputClass()} value={toDateInputValue(value)} onChange={(event) => onChange?.(event.currentTarget.value ? new Date(`${event.currentTarget.value}T00:00:00`) : null)} {...cleanProps(props).domProps} />);
export const DatePicker = NativeDateInput;
export const Calendar = DatePicker;

// `DateInput` used to be a bare `<input type="date">` — every screen using it
// showed the browser/OS's own unstyled native calendar (different look on
// every OS/browser, unthemeable, the "ficou padrão do navegador" complaint).
// This is a real calendar: a typed dd/mm/aaaa text field plus a button that
// opens a portal-rendered month grid matching the rest of the design system,
// the same shape as the already-good `FloatingDatePicker` used in
// SettingsPage/Agendamento — ported here so every `DateInput`/`DatePickerInput`
// consumer gets it for free instead of needing to opt into a different
// component. Contract stays `value: Date | null` / `onChange(date: Date | null)`
// to match every existing call site — no consumer changes needed.
const CALENDAR_WEEKDAYS = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];
const CALENDAR_MONTHS = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 12);
}
function sameDay(a: Date | null, b: Date | null) {
  if (!a || !b) return false;
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}
function formatDatePt(date: Date) {
  return `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`;
}

const DateInputPrimitive = forwardRef<HTMLInputElement, AnyProps>(function DateInputPrimitive({
  label,
  description,
  error,
  value,
  onChange,
  placeholder,
  disabled,
  required,
  withAsterisk,
  minDate,
  maxDate,
  className,
  ...props
}, ref) {
  const selectedDate = value instanceof Date && !Number.isNaN(value.getTime()) ? value : null;
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [opened, setOpened] = useState(false);
  const [viewDate, setViewDate] = useState(() => selectedDate || new Date());
  const [coords, setCoords] = useState<{ top: number; left: number } | null>(null);
  // A birthdate or similarly far-past field can be decades of "previous month"
  // clicks away — this lets the user jump straight to a year/month instead,
  // mirroring FloatingDatePicker's own month/year picker.
  const [showMonthYearPicker, setShowMonthYearPicker] = useState(false);
  const [yearDraft, setYearDraft] = useState(() => String((selectedDate || new Date()).getFullYear()));

  useEffect(() => {
    if (!opened) {
      setViewDate(selectedDate || new Date());
      setShowMonthYearPicker(false);
    }
  }, [selectedDate, opened]);

  useLayoutEffect(() => {
    if (!opened) return undefined;
    const updatePosition = () => {
      const rect = wrapperRef.current?.getBoundingClientRect();
      if (!rect) return;
      const width = Math.min(304, window.innerWidth - 32);
      const estimatedHeight = showMonthYearPicker ? 470 : 360;
      const opensAbove = rect.bottom + estimatedHeight > window.innerHeight && rect.top > estimatedHeight;
      setCoords({
        top: opensAbove ? Math.max(8, rect.top - estimatedHeight - 8) : Math.min(rect.bottom + 8, window.innerHeight - estimatedHeight - 8),
        left: Math.min(Math.max(8, rect.left), window.innerWidth - width - 8),
      });
    };
    updatePosition();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);
    const closeOnOutsideClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!wrapperRef.current?.contains(target) && !target.closest('.ui-calendar-popover')) setOpened(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === 'Escape') setOpened(false); };
    document.addEventListener('mousedown', closeOnOutsideClick);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
      document.removeEventListener('mousedown', closeOnOutsideClick);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [opened, showMonthYearPicker]);

  const calendarDays = useMemo(() => {
    const firstWeekday = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1).getDay();
    const daysInMonth = new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 0).getDate();
    return Array.from({ length: 42 }, (_, index) => {
      const dayOffset = index - firstWeekday + 1;
      const date = new Date(viewDate.getFullYear(), viewDate.getMonth(), dayOffset, 12);
      return { date, currentMonth: dayOffset > 0 && dayOffset <= daysInMonth };
    });
  }, [viewDate]);

  const isDisabled = (date: Date) => {
    if (minDate && date < startOfDay(minDate)) return true;
    if (maxDate && date > startOfDay(maxDate)) return true;
    return false;
  };

  const commitDate = (date: Date | null) => {
    onChange?.(date);
    setOpened(false);
  };

  const applyMonthYear = () => {
    const year = Number(yearDraft);
    if (!Number.isInteger(year) || year < 1900 || year > 2100) return;
    setViewDate(new Date(year, viewDate.getMonth(), 1, 12));
    setShowMonthYearPicker(false);
  };

  const today = startOfDay(new Date());

  return (
    <Field label={label} description={description} error={error} withAsterisk={withAsterisk} className={className}>
      <div ref={wrapperRef} className="ui-calendar-field">
        <input
          ref={ref}
          type="text"
          className={inputClass()}
          value={selectedDate ? formatDatePt(selectedDate) : ''}
          placeholder={resolvePlaceholder(placeholder)}
          disabled={disabled}
          readOnly
          aria-haspopup="dialog"
          aria-expanded={opened}
          aria-required={Boolean(required || withAsterisk)}
          aria-invalid={Boolean(error)}
          onClick={() => !disabled && setOpened((current) => !current)}
          {...cleanProps(props).domProps}
        />
        <button type="button" className="ui-calendar-trigger" aria-label="Abrir calendário" disabled={disabled} onClick={() => !disabled && setOpened((current) => !current)}>
          <CalendarDays size={16} aria-hidden="true" />
        </button>
        {opened && coords && createPortal(
          <div className="ui-calendar-popover" role="dialog" aria-label="Selecionar data" style={{ position: 'fixed', top: coords.top, left: coords.left }}>
            <div className="ui-calendar-header">
              <button
                type="button"
                className="ui-calendar-month-year-trigger"
                aria-expanded={showMonthYearPicker}
                onClick={() => { setYearDraft(String(viewDate.getFullYear())); setShowMonthYearPicker((current) => !current); }}
              >
                <strong>{`${CALENDAR_MONTHS[viewDate.getMonth()].charAt(0).toUpperCase()}${CALENDAR_MONTHS[viewDate.getMonth()].slice(1)} de ${viewDate.getFullYear()}`}</strong>
                <ChevronDown size={14} aria-hidden="true" />
              </button>
              <div className="ui-calendar-nav">
                <button type="button" aria-label="Mês anterior" onClick={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1, 12))}>‹</button>
                <button type="button" aria-label="Próximo mês" onClick={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1, 12))}>›</button>
              </div>
            </div>
            {showMonthYearPicker ? (
              <div className="ui-calendar-month-year-picker">
                <div className="ui-calendar-year-field">
                  <label htmlFor="ui-calendar-year-input">Ano</label>
                  <input
                    id="ui-calendar-year-input"
                    type="number"
                    min={1900}
                    max={2100}
                    value={yearDraft}
                    onChange={(event) => setYearDraft(event.currentTarget.value)}
                    onKeyDown={(event) => { if (event.key === 'Enter') applyMonthYear(); }}
                  />
                </div>
                <div className="ui-calendar-month-grid" aria-label="Selecionar mês">
                  {CALENDAR_MONTHS.map((month, monthIndex) => (
                    <button
                      key={month}
                      type="button"
                      className={cn('ui-calendar-month-option', monthIndex === viewDate.getMonth() && 'ui-calendar-month-option-selected')}
                      onClick={() => setViewDate(new Date(Number(yearDraft) || viewDate.getFullYear(), monthIndex, 1, 12))}
                    >
                      {month.slice(0, 3)}
                    </button>
                  ))}
                </div>
                <button type="button" className="ui-calendar-apply-jump" onClick={applyMonthYear}>Ir para esta data</button>
              </div>
            ) : (
              <>
                <div className="ui-calendar-weekdays">
                  {CALENDAR_WEEKDAYS.map((day, index) => <span key={`${day}-${index}`}>{day}</span>)}
                </div>
                <div className="ui-calendar-days">
                  {calendarDays.map(({ date, currentMonth }, index) => (
                    <button
                      key={`${date.toISOString()}-${index}`}
                      type="button"
                      disabled={isDisabled(date)}
                      className={cn(
                        'ui-calendar-day',
                        !currentMonth && 'ui-calendar-day-outside',
                        sameDay(date, selectedDate) && 'ui-calendar-day-selected',
                        sameDay(date, today) && 'ui-calendar-day-today',
                      )}
                      onClick={() => commitDate(date)}
                    >
                      {date.getDate()}
                    </button>
                  ))}
                </div>
              </>
            )}
            <div className="ui-calendar-footer">
              <button type="button" onClick={() => commitDate(null)}>Limpar</button>
              <button type="button" disabled={isDisabled(today)} onClick={() => commitDate(today)}>Hoje</button>
            </div>
          </div>,
          document.body,
        )}
      </div>
    </Field>
  );
});
export const DateInput = DateInputPrimitive as unknown as RefComponent<DateFieldProps, HTMLInputElement>;
export const DatePickerInput = DateInput;
export const TimeInput = TextInput;

const CheckboxPrimitive = forwardRef<HTMLInputElement, AnyProps>(({ label, description, error, checked, onChange, className, ...props }, ref) => <Field label={label} description={description} error={error} className={cn('ui-check-field', className)}><input ref={ref} type="checkbox" checked={checked} onChange={onChange} {...cleanProps(props).domProps} /></Field>);
export const Checkbox = CheckboxPrimitive as unknown as RefComponent<CheckboxFieldProps, HTMLInputElement>;
export const Radio: any = forwardRef<HTMLInputElement, AnyProps>((props, ref) => <Checkbox ref={ref} {...props} type="radio" />);
Radio.Group = ({ children, value, onChange, className, ...props }: AnyProps) => <div className={cn('ui-radio-group', className)} {...cleanProps(props).domProps}>{Children.map(children, (child) => { if (!isValidElement(child)) return child; const element = child as ReactElement<AnyProps>; return cloneElement(element, { checked: element.props.value === value, onChange: () => onChange?.(element.props.value) }); })}</div>;
export const Switch = forwardRef<HTMLInputElement, AnyProps>((props, ref) => <Checkbox ref={ref} {...props} className={cn('ui-switch', props.className)} />);
export const SegmentedControl = forwardRef<HTMLButtonElement, AnyProps>((props, ref) => <Select ref={ref} {...props} />);

export const Badge = forwardRef<HTMLSpanElement, AnyProps>(({ children, className, ...props }, ref) => <span ref={ref} className={cn('ui-badge', `ui-badge-${props.color || 'blue'}`, props.variant && props.variant !== 'light' && `ui-badge-variant-${props.variant}`, className)} {...cleanProps(props).domProps}>{children}</span>);
const THEME_ICON_SIZE_SCALE: Record<string, string> = { xs: '1.125rem', sm: '1.625rem', md: '2.25rem', lg: '3rem', xl: '3.75rem' };
const THEME_ICON_RADIUS_SCALE: Record<string, string> = { xs: '.25rem', sm: '.375rem', md: '.5rem', lg: '.75rem', xl: '1rem' };
const ThemeIconPrimitive = forwardRef<HTMLSpanElement, AnyProps>(({ children, className, color, variant, size, radius, ...props }, ref) => {
  const { domProps, style } = cleanProps(props);
  const sizeValue = typeof size === 'number' ? `${size}px` : (size ? THEME_ICON_SIZE_SCALE[size] : undefined);
  const radiusValue = typeof radius === 'number' ? `${radius}px` : (radius ? (THEME_ICON_RADIUS_SCALE[radius] ?? radius) : undefined);
  return (
    <span
      ref={ref}
      className={cn('ui-theme-icon', `ui-theme-icon-${color || 'primary'}`, variant === 'filled' && 'ui-theme-icon-variant-filled', className)}
      style={{ ...(sizeValue ? { width: sizeValue, height: sizeValue } : {}), ...(radiusValue ? { borderRadius: radiusValue } : {}), ...style }}
      {...domProps}
    >
      {children}
    </span>
  );
});
export const ThemeIcon = ThemeIconPrimitive;
export const Avatar = forwardRef<HTMLSpanElement, AnyProps>(({ children, src, alt, className, ...props }, ref) => <span ref={ref} className={cn('ui-avatar', className)} {...cleanProps(props).domProps}>{src ? <img src={src} alt={alt || ''} /> : children}</span>);
export const Image = (props: AnyProps) => <img alt="" {...cleanProps(props).domProps} />;
export const Code = ({ children, className, ...props }: AnyProps) => <code className={cn('ui-code', className)} {...cleanProps(props).domProps}>{children}</code>;
export const Loader = ({ size = 'md' }: AnyProps) => <span role="status" aria-label="Carregando" className={cn('ui-loader', `ui-loader-${size}`)} />;
export const Skeleton = ({ className, ...props }: AnyProps) => <span className={cn('ui-skeleton', className)} {...cleanProps(props).domProps} />;
export const Progress = ({ value = 0, className, ...props }: AnyProps) => <div className={cn('ui-progress', className)} {...cleanProps(props).domProps}><span style={{ width: `${value}%` }} /></div>;
export const Divider = ({ className, ...props }: AnyProps) => <hr className={cn('ui-divider', className)} {...cleanProps(props).domProps} />;
export const Alert = ({ title, children, className, ...props }: AnyProps) => <div role="alert" className={cn('ui-alert', className)} {...cleanProps(props).domProps}>{title && <strong>{title}</strong>}{children}</div>;

export const List: any = ({ children, className, ...props }: AnyProps) => <ul className={cn('ui-list', className)} {...cleanProps(props).domProps}>{children}</ul>;
List.Item = ({ children, ...props }: AnyProps) => <li {...cleanProps(props).domProps}>{children}</li>;
export const Table: any = ({ children, className, ...props }: AnyProps) => { const { domProps, style } = cleanProps(props); return <div className="ui-table-wrap"><table className={cn('ui-table', className)} style={style} {...domProps}>{children}</table></div>; };
Table.Thead = ({ children, ...props }: AnyProps) => { const { domProps, style } = cleanProps(props); return <thead style={style} {...domProps}>{children}</thead>; };
Table.Tbody = ({ children, ...props }: AnyProps) => { const { domProps, style } = cleanProps(props); return <tbody style={style} {...domProps}>{children}</tbody>; };
Table.Tr = ({ children, ...props }: AnyProps) => { const { domProps, style } = cleanProps(props); return <tr style={style} {...domProps}>{children}</tr>; };
Table.Th = ({ children, ...props }: AnyProps) => { const { domProps, style } = cleanProps(props); return <th style={style} {...domProps}>{children}</th>; };
Table.Td = ({ children, ...props }: AnyProps) => { const { domProps, style } = cleanProps(props); return <td style={style} {...domProps}>{children}</td>; };
Table.ScrollContainer = ({ children }: AnyProps) => <div className="ui-table-scroll">{children}</div>;

const Overlay = ({ children, className = '', onClick }: AnyProps) => <div className={cn('ui-overlay', className)} onMouseDown={onClick}>{children}</div>;
const MODAL_SIZE_SCALE: Record<string, string> = {
  xs: '20rem',
  sm: '24rem',
  md: '28rem',
  lg: '42rem',
  xl: '56rem',
};

function modalWidth(size: any) {
  if (size === undefined) return undefined;
  if (typeof size === 'number') return `${size}px`;
  return MODAL_SIZE_SCALE[size] ?? size;
}

export const Modal = ({ opened, onClose, title, children, footer, className, size, fullScreen, closeButtonProps, ...props }: AnyProps) => {
  if (!opened) return null;
  const width = fullScreen ? '100vw' : modalWidth(size);
  const { domProps, style } = cleanProps(props);
  const modalStyle: CSSProperties = {
    ...style,
    ...(width ? { width: `min(100%, ${width})` } : {}),
    ...(fullScreen ? { height: '100dvh', maxHeight: '100dvh', borderRadius: 0 } : {}),
  };
  return createPortal(
    <Overlay
      className={fullScreen ? 'ui-overlay-fullscreen' : undefined}
      onClick={(event: any) => event.target === event.currentTarget && onClose?.()}
    >
      <div role="dialog" aria-modal="true" className={cn('ui-modal', className)} {...domProps} style={modalStyle}>
        {title && (
          <div className="ui-modal-header">
            <h2>{title}</h2>
            <button type="button" aria-label={closeButtonProps?.['aria-label'] || 'Fechar'} onClick={onClose}>×</button>
          </div>
        )}
        <div className="ui-modal-body">{children}</div>
        {footer && <div className="ui-modal-footer">{footer}</div>}
      </div>
    </Overlay>,
    document.body,
  );
};
export const Drawer = Modal;

type PopupCoords = { top?: number; bottom?: number; left?: number; right?: number };

const popupCoords = (rect: DOMRect, position: string, gap = 6): PopupCoords => {
  const [vert, horiz] = position.split('-');
  const coords: PopupCoords = {};
  if (vert === 'top') coords.bottom = window.innerHeight - rect.top + gap;
  else coords.top = rect.bottom + gap;
  if (horiz === 'end') coords.right = window.innerWidth - rect.right;
  else coords.left = rect.left;
  return coords;
};

const PopupContext = createContext<{
  open: boolean;
  setOpen: (open: boolean) => void;
  wrapperRef: { current: HTMLSpanElement | null };
  dropdownRef: { current: HTMLDivElement | null };
  coords: PopupCoords | null;
  width?: number | string;
}>({ open: false, setOpen: () => undefined, wrapperRef: { current: null }, dropdownRef: { current: null }, coords: null });

function Popup({ children, opened, onChange, onClose, position = 'bottom-start', width }: AnyProps) {
  const wrapperRef = useRef<HTMLSpanElement | null>(null);
  const dropdownRef = useRef<HTMLDivElement | null>(null);
  const [internalOpen, setInternalOpen] = useState(false);
  const open = opened ?? internalOpen;
  const [coords, setCoords] = useState<PopupCoords | null>(null);

  const setOpen = (next: boolean) => {
    setInternalOpen(next);
    onChange?.(next);
    if (!next) onClose?.();
  };

  useLayoutEffect(() => {
    if (!open) return undefined;
    const updateCoords = () => {
      const rect = wrapperRef.current?.firstElementChild?.getBoundingClientRect();
      if (!rect) return;
      setCoords(popupCoords(rect, position));
    };
    updateCoords();
    window.addEventListener('scroll', updateCoords, true);
    window.addEventListener('resize', updateCoords);
    return () => {
      window.removeEventListener('scroll', updateCoords, true);
      window.removeEventListener('resize', updateCoords);
    };
  }, [open, position]);

  // Clamp the dropdown back on-screen once its real size is known.
  // popupCoords() above only knows the trigger's position — it has no idea how
  // wide/tall the dropdown will actually render (that depends on its content,
  // or the `width` prop), so a Menu/Popover near a screen edge (e.g. the last
  // column of a wide table) would otherwise render partly or fully off the
  // right/bottom edge of the viewport. This runs a second pass after the
  // dropdown mounts at its initial guess and nudges it back inside a small
  // margin if it overflows any edge; it's a no-op (and stops re-running) once
  // nothing overflows.
  useLayoutEffect(() => {
    if (!open || !coords || !dropdownRef.current) return undefined;
    const margin = 8;
    const dropRect = dropdownRef.current.getBoundingClientRect();
    const next: PopupCoords = { ...coords };
    let changed = false;

    if (dropRect.right > window.innerWidth - margin) {
      const overflow = dropRect.right - (window.innerWidth - margin);
      if (typeof next.left === 'number') { next.left = Math.max(margin, next.left - overflow); changed = true; }
      else if (typeof next.right === 'number') { next.right = Math.max(margin, next.right - overflow); changed = true; }
    }
    if (dropRect.left < margin) {
      const overflow = margin - dropRect.left;
      if (typeof next.left === 'number') { next.left = next.left + overflow; changed = true; }
      else if (typeof next.right === 'number') { next.right = Math.max(margin, next.right - overflow); changed = true; }
    }
    if (dropRect.bottom > window.innerHeight - margin) {
      const overflow = dropRect.bottom - (window.innerHeight - margin);
      if (typeof next.top === 'number') { next.top = Math.max(margin, next.top - overflow); changed = true; }
    }
    if (dropRect.top < margin) {
      const overflow = margin - dropRect.top;
      if (typeof next.top === 'number') { next.top = next.top + overflow; changed = true; }
    }

    if (changed) setCoords(next);
  }, [open, coords]);

  useEffect(() => {
    if (!open) return undefined;
    const closeOnOutsideClick = (event: MouseEvent) => {
      const target = event.target as Node;
      if (wrapperRef.current?.contains(target) || dropdownRef.current?.contains(target)) return;
      setOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', closeOnOutsideClick);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('mousedown', closeOnOutsideClick);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [open]);

  return <PopupContext.Provider value={{ open, setOpen, wrapperRef, dropdownRef, coords, width }}>{children}</PopupContext.Provider>;
}
function PopupTarget({ children }: AnyProps) {
  const { open, setOpen, wrapperRef } = useContext(PopupContext);
  if (!isValidElement(children)) return children;
  const element = children as ReactElement<AnyProps>;
  const cloned = cloneElement(element, { onClick: (event: any) => { element.props.onClick?.(event); setOpen(!open); } });
  return <span ref={wrapperRef} style={{ display: 'contents' }}>{cloned}</span>;
}
function PopupDropdown({ children, className, style, ...props }: AnyProps) {
  const { open, coords, dropdownRef, width } = useContext(PopupContext);
  if (!open || !coords) return null;
  return createPortal(
    <div
      ref={dropdownRef}
      className={cn('ui-popup', className)}
      style={{ position: 'fixed', margin: 0, ...coords, ...(width ? { width } : {}), ...style }}
      {...cleanProps(props).domProps}
    >
      {children}
    </div>,
    document.body,
  );
}
export const Popover: any = Popup;
Popover.Target = PopupTarget;
Popover.Dropdown = PopupDropdown;

export const Menu: any = Popup;
Menu.Target = PopupTarget;
Menu.Dropdown = PopupDropdown;
Menu.Item = ({ children, leftSection, rightSection, onClick, closeMenuOnClick = true, className, ...props }: AnyProps) => { const { setOpen } = useContext(PopupContext); return <button type="button" className={cn('ui-menu-item', className)} onClick={(event) => { onClick?.(event); if (closeMenuOnClick !== false) setOpen(false); }} {...cleanProps(props).domProps}><span className="ui-menu-item__icon" aria-hidden="true">{leftSection}</span><span className="ui-menu-item__label">{children}</span>{rightSection ? <span className="ui-menu-item__right">{rightSection}</span> : null}</button>; };
Menu.Label = ({ children, ...props }: AnyProps) => <div className="ui-menu-label" {...cleanProps(props).domProps}>{children}</div>;
Menu.Divider = Divider;

const TabsContext = createContext<{ value: string | null; setValue: (value: string) => void }>({ value: null, setValue: () => undefined });
export const Tabs: any = ({ children, value, defaultValue, onChange }: AnyProps) => { const [internal, setInternal] = useState(defaultValue ?? null); const current = value ?? internal; const setValue = (next: string) => { setInternal(next); onChange?.(next); }; return <TabsContext.Provider value={{ value: current, setValue }}>{children}</TabsContext.Provider>; };
Tabs.List = ({ children, ...props }: AnyProps) => <div className="ui-tabs-list" {...cleanProps(props).domProps}>{children}</div>;
Tabs.Tab = ({ children, value, ...props }: AnyProps) => { const ctx = useContext(TabsContext); return <button type="button" className={cn('ui-tab', ctx.value === value && 'ui-tab-active')} onClick={() => ctx.setValue(value)} {...cleanProps(props).domProps}>{children}</button>; };
Tabs.Panel = ({ children, value, ...props }: AnyProps) => { const ctx = useContext(TabsContext); return ctx.value === value ? <div {...cleanProps(props).domProps}>{children}</div> : null; };

export const Stepper: any = ({ children, active = 0, ...props }: AnyProps) => {
  const steps = Children.toArray(children).filter((child) => isValidElement(child) && (child as ReactElement<AnyProps>).type !== Stepper.Completed) as ReactElement<AnyProps>[];
  const totalSteps = steps.length;
  let stepIndex = 0;
  return (
    <div className="ui-stepper" {...cleanProps(props).domProps}>
      {Children.map(children, (child: any) => {
        if (!isValidElement(child)) return child;
        const element = child as ReactElement<AnyProps>;
        if (element.type === Stepper.Completed) {
          return active >= totalSteps ? cloneElement(element, { key: 'completed' }) : null;
        }
        const index = stepIndex++;
        return cloneElement(element, { active: index === active, index, key: index });
      })}
    </div>
  );
};
Stepper.Step = ({ children, label, description, active, ...props }: AnyProps) => <section className={cn('ui-step', active && 'ui-step-active')} {...cleanProps(props).domProps}>{label && <strong>{label}</strong>}{description && <small>{description}</small>}{active ? children : null}</section>;
Stepper.Completed = ({ children, ...props }: AnyProps) => <div className="ui-step-completed" {...cleanProps(props).domProps}>{children}</div>;
export const Collapse = ({ children, in: opened, ...props }: AnyProps) => opened ? <div {...cleanProps(props).domProps}>{children}</div> : null;
export const Transition = ({ children, mounted = true }: AnyProps) => mounted ? <>{typeof children === 'function' ? children({}) : children}</> : null;
const ScrollAreaPrimitive = ({ children, className, scrollbarSize, type, scrollHideDelay, offsetScrollbars, ...props }: AnyProps) => {
  const { domProps, style } = cleanProps(props);
  return <div className={cn('ui-scroll-area', className)} style={style} {...domProps}>{children}</div>;
};
export const ScrollArea: any = Object.assign(ScrollAreaPrimitive, { Autosize: ScrollAreaPrimitive });
// The previous implementation rendered `label` (frequently a rich JSX node —
// patient name, room, status, all in one hover card) straight into the native
// `title` HTML attribute, which only accepts a string. Every Tooltip with JSX
// content silently produced "[object Object]" (or nothing) instead of the
// intended popover — no arrow, no position control, no styling. This is a real
// floating tooltip: hover/focus shows a portal-rendered popover positioned
// against the trigger's bounding box, closing on scroll/resize to avoid
// drifting out of place.
type TooltipPosition = 'top' | 'bottom' | 'left' | 'right';
function tooltipPlacement(rect: DOMRect, position: TooltipPosition, offset: number) {
  switch (position) {
    case 'bottom':
      return { top: rect.bottom + offset, left: rect.left + rect.width / 2, transform: 'translate(-50%, 0)' };
    case 'left':
      return { top: rect.top + rect.height / 2, left: rect.left - offset, transform: 'translate(-100%, -50%)' };
    case 'right':
      return { top: rect.top + rect.height / 2, left: rect.right + offset, transform: 'translate(0, -50%)' };
    case 'top':
    default:
      return { top: rect.top - offset, left: rect.left + rect.width / 2, transform: 'translate(-50%, -100%)' };
  }
}
export const Tooltip = ({
  children,
  label,
  title,
  position = 'top',
  offset = 8,
  withArrow,
  disabled,
  openDelay = 0,
  closeDelay = 0,
  multiline,
  styles,
  className,
}: AnyProps) => {
  const content = label ?? title;
  const hasContent = content !== undefined && content !== null && content !== '';
  const [opened, setOpened] = useState(false);
  const [coords, setCoords] = useState<{ top: number; left: number; transform: string } | null>(null);
  const wrapperRef = useRef<HTMLSpanElement>(null);
  const openTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const show = () => {
    if (disabled || !hasContent) return;
    clearTimeout(closeTimer.current);
    openTimer.current = setTimeout(() => {
      // The wrapper itself uses `display: contents` (so it doesn't add a box
      // around the trigger), which means its own getBoundingClientRect() is
      // always a zero rect in Chromium — must measure the actual child.
      const rect = wrapperRef.current?.firstElementChild?.getBoundingClientRect();
      if (!rect) return;
      setCoords(tooltipPlacement(rect, position, offset));
      setOpened(true);
    }, openDelay);
  };
  const hide = () => {
    clearTimeout(openTimer.current);
    closeTimer.current = setTimeout(() => setOpened(false), closeDelay);
  };

  useEffect(() => () => {
    clearTimeout(openTimer.current);
    clearTimeout(closeTimer.current);
  }, []);

  useEffect(() => {
    if (!opened) return undefined;
    const close = () => setOpened(false);
    window.addEventListener('scroll', close, true);
    window.addEventListener('resize', close);
    return () => {
      window.removeEventListener('scroll', close, true);
      window.removeEventListener('resize', close);
    };
  }, [opened]);

  return (
    <span ref={wrapperRef} style={{ display: 'contents' }} onMouseEnter={show} onMouseLeave={hide} onFocus={show} onBlur={hide}>
      {children}
      {opened && coords && hasContent && createPortal(
        <div
          role="tooltip"
          className={cn('ui-tooltip', multiline && 'ui-tooltip-multiline', withArrow && 'ui-tooltip-with-arrow', className)}
          style={{ position: 'fixed', top: coords.top, left: coords.left, transform: coords.transform, ...(styles?.tooltip || {}) }}
        >
          {content}
          {withArrow && <span className="ui-tooltip-arrow" style={styles?.arrow} />}
        </div>,
        document.body,
      )}
    </span>
  );
};
export const Timeline: any = ({ children, ...props }: AnyProps) => <div className="ui-timeline" {...cleanProps(props).domProps}>{children}</div>;
Timeline.Item = ({ children, title, ...props }: AnyProps) => <div className="ui-timeline-item" {...cleanProps(props).domProps}>{title && <strong>{title}</strong>}{children}</div>;

export const Pagination = ({ total = 0, value, onChange, ...props }: AnyProps) => <nav className="ui-pagination" {...cleanProps(props).domProps}>{Array.from({ length: total }, (_, index) => <button key={index} type="button" className={value === index + 1 ? 'ui-pagination-active' : ''} onClick={() => onChange?.(index + 1)}>{index + 1}</button>)}</nav>;

export function createTheme(config: AnyProps) { return config; }
export function rem(value: number | string) { return typeof value === 'number' ? `${value}px` : value; }
export function useMediaQuery(query: string) { const [matches, setMatches] = useState(false); useEffect(() => { const media = window.matchMedia?.(query); if (!media) return; const update = () => setMatches(media.matches); update(); media.addEventListener?.('change', update); return () => media.removeEventListener?.('change', update); }, [query]); return matches; }
export function useElementSize() { const [size, setSize] = useState({ width: 0, height: 0 }); const ref = (node: HTMLElement | null) => { if (!node || typeof ResizeObserver === 'undefined') return; const observer = new ResizeObserver(([entry]) => { if (entry) setSize({ width: entry.contentRect.width, height: entry.contentRect.height }); }); observer.observe(node); }; return { ref, ...size }; }
export function useDebouncedValue<T>(value: T, delay = 300) { const [debounced, setDebounced] = useState(value); useEffect(() => { const timer = window.setTimeout(() => setDebounced(value), delay); return () => window.clearTimeout(timer); }, [value, delay]); return [debounced, { cancel: () => undefined }] as const; }
export function useDisclosure(initial = false) { const [opened, setOpened] = useState(initial); return [opened, { open: () => setOpened(true), close: () => setOpened(false), toggle: () => setOpened((current) => !current) }] as const; }
export function useColorScheme() {
  const [colorScheme, setScheme] = useState<'light' | 'dark'>(() => {
    const attr = document.documentElement.getAttribute('data-color-scheme');
    const stored = window.localStorage.getItem('saudy-color-scheme') || window.localStorage.getItem('mantine-color-scheme');
    return (attr || stored) === 'dark' ? 'dark' : 'light';
  });

  useEffect(() => {
    const sync = () => setScheme(document.documentElement.getAttribute('data-color-scheme') === 'dark' ? 'dark' : 'light');
    const observer = new MutationObserver(sync);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-color-scheme'] });
    window.addEventListener('app-color-scheme:changed', sync);
    window.addEventListener('storage', sync);
    sync();
    return () => {
      observer.disconnect();
      window.removeEventListener('app-color-scheme:changed', sync);
      window.removeEventListener('storage', sync);
    };
  }, []);

  const setColorScheme = (next: 'light' | 'dark' | 'auto') => {
    const scheme = next === 'auto' ? 'light' : next;
    setScheme(scheme);
    document.documentElement.setAttribute('data-color-scheme', scheme);
    window.localStorage.setItem('saudy-color-scheme', scheme);
    window.dispatchEvent(new CustomEvent('app-color-scheme:changed', { detail: scheme }));
  };

  return { colorScheme, setColorScheme };
}
export function useColorSchemeValue(fallback: 'light' | 'dark' = 'light') { return document.documentElement.getAttribute('data-color-scheme') || fallback; }
export function ThemeProvider({ children, forceColorScheme }: AnyProps) { useEffect(() => { if (forceColorScheme) document.documentElement.setAttribute('data-color-scheme', forceColorScheme); }, [forceColorScheme]); return <>{children}</>; }
export const LocaleProvider = ({ children }: AnyProps) => <>{children}</>;

type Toast = { id: string; title?: string; message?: string; color?: string; [key: string]: any };
const toastEvent = 'saudy:toast';
export function showNotification(notification: Record<string, any>) { window.dispatchEvent(new CustomEvent(toastEvent, { detail: { ...notification, id: notification.id || crypto.randomUUID() } })); }
export const notifications = { show: (notification: Record<string, any>) => showNotification(notification), update: (notification: Record<string, any>) => showNotification(notification), hide: (id: string) => window.dispatchEvent(new CustomEvent(`${toastEvent}:hide`, { detail: id })) };
export function Notifications({ limit = 5 }: AnyProps) { const [items, setItems] = useState<Toast[]>([]); useEffect(() => { const add = (event: Event) => { const toast = (event as CustomEvent<Toast>).detail; setItems((current) => [toast, ...current].slice(0, limit)); const timer = window.setTimeout(() => setItems((current) => current.filter((item) => item.id !== toast.id)), 5000); return () => window.clearTimeout(timer); }; const hide = (event: Event) => setItems((current) => current.filter((item) => item.id !== (event as CustomEvent<string>).detail)); window.addEventListener(toastEvent, add); window.addEventListener(`${toastEvent}:hide`, hide); return () => { window.removeEventListener(toastEvent, add); window.removeEventListener(`${toastEvent}:hide`, hide); }; }, [limit]); return <div className="ui-toasts" aria-live="polite">{items.map((item) => <div key={item.id} className={cn('ui-toast', `ui-toast-${item.color || 'blue'}`)}><strong>{item.title}</strong><span>{item.message}</span><button type="button" aria-label="Fechar" onClick={() => notifications.hide(item.id)}>×</button></div>)}</div>; }

export type BoxProps = AnyProps;
export type MultiSelectProps = AnyProps;
export type NumberInputProps = AnyProps;
export type SelectProps = AnyProps;
export type TagsInputProps = AnyProps;
export type DateInputProps = AnyProps;
export type TextareaProps = AnyProps;
