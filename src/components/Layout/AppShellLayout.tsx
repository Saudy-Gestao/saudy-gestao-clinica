/**
 * Shell persistente do app: sidebar fixa à esquerda com os macros (seções) e o
 * conteúdo da rota atual à direita. As páginas continuam renderizando o próprio
 * Header dentro da coluna de conteúdo.
 *
 * Clicar em um macro leva ao dashboard com aquela seção aberta em blocos
 * (/dashboard?secao=<key>); "Visão Geral" leva ao dashboard clássico. Em
 * qualquer outra rota, o macro que contém a rota atual fica destacado.
 */
import { useState } from 'react';
import { useLocation, useNavigate, useSearchParams, Outlet } from 'react-router-dom';
import { Tooltip } from '@mantine/core';
import { ChevronLeft, ChevronRight } from 'lucide-react';
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

  const isAuthenticated = authService.isAuthenticated();
  const currentUser = authService.getCurrentUser() as any;
  const isAdmHubOnly = Boolean(currentUser?.isAdmHubOnly);

  const activeKey = location.pathname === '/dashboard'
    ? (searchParams.get('secao') || OVERVIEW_SECTION_KEY)
    : findSectionKeyForPath(location.pathname);

  const goToSection = (key: string) => {
    if (key === OVERVIEW_SECTION_KEY) {
      navigate('/dashboard');
      return;
    }
    navigate(`/dashboard?secao=${key}`);
  };

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

  return (
    <div className="saudy-shell">
      <nav className="saudy-sidebar" data-collapsed={collapsed || undefined} aria-label="Navegação principal">
        <div className="saudy-sidebar__brand">
          {!collapsed ? (
            <>
              <img src="/logo_azul_32x32.svg" width={26} height={26} alt="" style={{ filter: 'brightness(0) invert(1)' }} />
              <span className="saudy-sidebar__brand-name">Saud<span>y</span></span>
            </>
          ) : null}
          <button
            type="button"
            className="saudy-sidebar__collapse-toggle"
            onClick={toggleCollapsed}
            aria-label={collapsed ? 'Expandir menu' : 'Recolher menu'}
          >
            {collapsed ? <ChevronRight size={15} /> : <ChevronLeft size={15} />}
          </button>
        </div>

        {!collapsed ? <p className="saudy-sidebar__label">Menu</p> : null}

        <Tooltip label={OVERVIEW_ENTRY.title} position="right" disabled={!collapsed} withArrow>
          <button
            type="button"
            className="saudy-sidebar__item"
            data-active={activeKey === OVERVIEW_SECTION_KEY || undefined}
            onClick={() => goToSection(OVERVIEW_SECTION_KEY)}
          >
            <span className="saudy-sidebar__item-icon"><OVERVIEW_ENTRY.icon size={17} /></span>
            {!collapsed ? OVERVIEW_ENTRY.title : null}
          </button>
        </Tooltip>

        {sections.map((section) => (
          <Tooltip key={section.key} label={section.title} position="right" disabled={!collapsed} withArrow>
            <button
              type="button"
              className="saudy-sidebar__item"
              data-active={activeKey === section.key || undefined}
              onClick={() => goToSection(section.key)}
            >
              <span className="saudy-sidebar__item-icon"><section.icon size={17} /></span>
              {!collapsed ? section.title : null}
            </button>
          </Tooltip>
        ))}

        {!collapsed ? <div className="saudy-sidebar__footer">Saudy · Gestão Clínica</div> : null}
      </nav>

      <div className="saudy-shell__content">
        <Outlet />
      </div>
    </div>
  );
}
