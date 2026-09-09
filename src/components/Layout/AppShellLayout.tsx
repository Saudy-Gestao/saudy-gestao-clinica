/**
 * Shell persistente do app: sidebar fixa à esquerda com os macros (seções) e o
 * conteúdo da rota atual à direita. As páginas continuam renderizando o próprio
 * Header dentro da coluna de conteúdo.
 *
 * Clicar em um macro leva ao dashboard com aquela seção aberta em blocos
 * (/dashboard?secao=<key>); "Visão Geral" leva ao dashboard clássico. Em
 * qualquer outra rota, o macro que contém a rota atual fica destacado.
 */
import { useEffect, useState } from 'react';
import { useLocation, useNavigate, useSearchParams, Outlet } from 'react-router-dom';
import { Tooltip } from '@/components/ui';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import authService from '../../services/authService';
import {
  OVERVIEW_ENTRY,
  OVERVIEW_SECTION_KEY,
  findSectionKeyForPath,
  useVisibleSections,
} from '../../lib/moduleCatalog';
import './AppShellLayout.css';

const COLLAPSED_STORAGE_KEY = 'saudy:sidebar-collapsed';

export function AppShellLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { sections } = useVisibleSections();
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem(COLLAPSED_STORAGE_KEY) === 'true');
  const [mobileOpen, setMobileOpen] = useState(false);

  const isAuthenticated = authService.isAuthenticated();
  const currentUser = authService.getCurrentUser() as any;
  const isAdmHubOnly = Boolean(currentUser?.isAdmHubOnly);

  const activeKey = location.pathname === '/dashboard'
    ? (searchParams.get('secao') || OVERVIEW_SECTION_KEY)
    : findSectionKeyForPath(location.pathname);

  const goToSection = (key: string) => {
    setMobileOpen(false);
    if (key === OVERVIEW_SECTION_KEY) {
      navigate('/dashboard');
      return;
    }
    navigate(`/dashboard?secao=${key}`);
  };

  useEffect(() => {
    const toggleMobileSidebar = () => setMobileOpen((previous) => !previous);
    const closeMobileSidebar = () => setMobileOpen(false);

    window.addEventListener('saudy:sidebar-toggle', toggleMobileSidebar);
    window.addEventListener('saudy:sidebar-close', closeMobileSidebar);
    return () => {
      window.removeEventListener('saudy:sidebar-toggle', toggleMobileSidebar);
      window.removeEventListener('saudy:sidebar-close', closeMobileSidebar);
    };
  }, []);

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  const toggleCollapsed = () => {
    setCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem(COLLAPSED_STORAGE_KEY, String(next));
      return next;
    });
  };

  if (!isAuthenticated || isAdmHubOnly) {
    return <Outlet />;
  }

  const showExpandedSidebar = !collapsed || mobileOpen;

  return (
    <div className="saudy-shell">
      {mobileOpen ? (
        <button
          type="button"
          className="saudy-sidebar__scrim"
          onClick={() => setMobileOpen(false)}
          aria-label="Fechar menu principal"
        />
      ) : null}

      <nav
        className="saudy-sidebar"
        data-collapsed={collapsed || undefined}
        data-mobile-open={mobileOpen || undefined}
        aria-label="Navegação principal"
      >
        <div className="saudy-sidebar__brand">
          <img className="saudy-sidebar__brand-logo" src="/logo_azul_32x32.svg" width={28} height={28} alt="" />
          {showExpandedSidebar ? <span className="saudy-sidebar__brand-name">Saud<span>y</span></span> : null}
          <button
            type="button"
            className="saudy-sidebar__collapse-toggle"
            onClick={toggleCollapsed}
            aria-label={collapsed ? 'Expandir menu' : 'Recolher menu'}
          >
            {collapsed ? <ChevronRight size={15} /> : <ChevronLeft size={15} />}
          </button>
          <button
            type="button"
            className="saudy-sidebar__mobile-close"
            onClick={() => setMobileOpen(false)}
            aria-label="Fechar menu principal"
          >
            <X size={18} />
          </button>
        </div>

        {showExpandedSidebar ? <p className="saudy-sidebar__label">Navegação principal</p> : null}

        <div className="saudy-sidebar__nav">
          <Tooltip label={OVERVIEW_ENTRY.title} position="right" disabled={!collapsed || mobileOpen} withArrow>
            <button
              type="button"
              className="saudy-sidebar__item"
              data-active={activeKey === OVERVIEW_SECTION_KEY || undefined}
              aria-current={activeKey === OVERVIEW_SECTION_KEY ? 'page' : undefined}
              onClick={() => goToSection(OVERVIEW_SECTION_KEY)}
            >
              <span className="saudy-sidebar__item-icon"><OVERVIEW_ENTRY.icon size={17} /></span>
              {showExpandedSidebar ? OVERVIEW_ENTRY.title : null}
            </button>
          </Tooltip>

          <div className="saudy-sidebar__section-divider" aria-hidden="true" />

          {sections.map((section) => (
            <Tooltip key={section.key} label={section.title} position="right" disabled={!collapsed || mobileOpen} withArrow>
              <button
                type="button"
                className="saudy-sidebar__item"
                data-active={activeKey === section.key || undefined}
                aria-current={activeKey === section.key ? 'page' : undefined}
                onClick={() => goToSection(section.key)}
              >
                <span className="saudy-sidebar__item-icon"><section.icon size={17} /></span>
                {showExpandedSidebar ? section.title : null}
              </button>
            </Tooltip>
          ))}
        </div>

        {showExpandedSidebar ? (
          <div className="saudy-sidebar__footer">
            <span className="saudy-sidebar__footer-dot" aria-hidden="true" />
            <span>Saudy Gestão</span>
            <small>Clínica integrada</small>
          </div>
        ) : null}
      </nav>

      <div className="saudy-shell__content">
        <Outlet />
      </div>
    </div>
  );
}
