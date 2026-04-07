import React from "react";
import {
  Activity,
  ArrowRight,
  BarChart3,
  Check,
  CheckCircle2,
  Copy,
  Download,
  ExternalLink,
  FileImage,
  FileText,
  Globe,
  Home,
  Layers,
  Layout,
  LayoutDashboard,
  Mail,
  MonitorSmartphone,
  Palette,
  Radar,
  Search,
  Shield,
  ShieldCheck,
  Sparkles,
  Target,
  TrendingUp,
  Type,
  Users,
  Workflow,
  Zap,
} from "lucide-react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  ForgeIcon,
  ForgeLogo,
  ForgeLogoMono,
  ForgeIconMono,
} from "../../components/brand/Logo";

type AssetItem = {
  id: string;
  name: string;
  family: string;
  note: string;
  svg: string;
  preview: React.ReactNode;
  pngSize?: number;
  previewClassName?: string;
};

const COLORS = [
  { name: "Obsidian", hex: "#0A0A0A", usage: "Primary background" },
  { name: "Emerald Cyber", hex: "#10B981", usage: "Primary accent / success" },
  { name: "Zinc Deep", hex: "#18181B", usage: "Panels / surfaces" },
  { name: "Zinc Muted", hex: "#71717A", usage: "Secondary text" },
  { name: "Amber Warning", hex: "#F59E0B", usage: "Warnings / risk" },
  { name: "Cyber Red", hex: "#EF4444", usage: "Critical states / error" },
  { name: "Sky Signal", hex: "#38BDF8", usage: "Trust / reporting / data" },
  { name: "Violet Flow", hex: "#8B5CF6", usage: "Workflows / sequence views" },
];

const LOGO_SVGS = {
  primary:
    '<svg viewBox="0 0 256 256" fill="none" xmlns="http://www.w3.org/2000/svg"><rect width="256" height="256" rx="48" fill="#10B981"/><g transform="translate(28,71) scale(3.57)"><path d="M19.3821 23.2895L15.0401 27.6937C13.6029 29.134 11.6622 29.9391 9.64192 29.933C7.62159 29.9268 5.68572 29.11 4.25711 27.6609C2.8285 26.2118 2.02321 24.2481 2.01713 22.1987C2.01102 20.1493 2.80462 18.1808 4.22457 16.723L10.7099 10.1445C10.7066 10.0286 10.7043 9.91248 10.7043 9.79603C10.7036 8.81633 10.8276 7.84064 11.0732 6.89312L2.80432 15.2807C1.00385 17.1201 -0.00454786 19.6085 1.54203e-05 22.2005C0.00457872 24.7926 1.02173 27.2772 2.82866 29.11C4.6356 30.9429 7.08502 31.9746 9.64039 31.9791C12.1958 31.9838 14.6488 30.9609 16.4621 29.1345L20.8039 24.7303L19.3821 23.2895Z" fill="#0A0A0A"/><path d="M34.1052 32C32.837 32.0021 31.5809 31.7502 30.4091 31.2584C29.2373 30.7669 28.1726 30.0451 27.2765 29.1349L15.0401 16.7226C13.2331 14.8846 12.2192 12.3942 12.221 9.79851C12.2228 7.20278 13.2402 4.71389 15.0497 2.87846C16.8592 1.04304 19.3129 0.0111466 21.872 0.00940821C24.4309 0.00766985 26.886 1.03623 28.6978 2.86919L40.9343 15.2814C42.2855 16.6508 43.2059 18.396 43.5789 20.2964C43.9521 22.1966 43.7608 24.1664 43.0297 25.9564C42.2985 27.7464 41.0603 29.276 39.4716 30.352C37.883 31.4278 36.0154 32.0012 34.1052 32ZM28.6978 27.6937C30.1356 29.1311 32.0753 29.9335 34.094 29.9261C36.1126 29.9187 38.0466 29.1019 39.4741 27.6539C40.9015 26.2061 41.7067 24.2443 41.714 22.1967C41.7212 20.149 40.9302 18.1813 39.5131 16.723L27.2767 4.31075C26.5683 3.5818 25.7249 3.00222 24.7948 2.60541C23.8648 2.2086 22.8665 2.00241 21.8576 1.9987C20.8485 1.99497 19.8488 2.19383 18.9159 2.58378C17.9831 2.97373 17.1355 3.5471 16.422 4.27081C15.7085 4.99452 15.1433 5.85428 14.7589 6.80057C14.3744 7.74686 14.1784 8.76095 14.1821 9.78442C14.1857 10.8079 14.389 11.8205 14.7802 12.764C15.1714 13.7074 15.7427 14.563 16.4614 15.2814L28.6978 27.6937Z" fill="#0A0A0A"/><path d="M39.5138 2.86921L35.1719 7.27343L36.5931 8.71498L40.9349 4.31076C42.3727 2.87337 44.3124 2.07089 46.3311 2.07831C48.3497 2.08574 50.2837 2.90247 51.7112 4.35043C53.1386 5.79838 53.9438 7.76007 53.9511 9.80776C53.9583 11.8555 53.1673 13.823 51.7502 15.2814L45.2599 21.865C45.2927 22.9626 45.1689 24.0593 44.8924 25.1209L53.1714 16.723C54.9825 14.8859 56 12.3942 56 9.7961C56 7.19801 54.9825 4.70635 53.1714 2.86921C51.3602 1.03209 48.9039 0 46.3425 0C43.7813 0 41.3249 1.03209 39.5138 2.86921Z" fill="#0A0A0A"/></g></svg>',
  icon: '<svg viewBox="0 0 56 32" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M19.3821 23.2895L15.0401 27.6937C13.6029 29.134 11.6622 29.9391 9.64192 29.933C7.62159 29.9268 5.68572 29.11 4.25711 27.6609C2.8285 26.2118 2.02321 24.2481 2.01713 22.1987C2.01102 20.1493 2.80462 18.1808 4.22457 16.723L10.7099 10.1445C10.7066 10.0286 10.7043 9.91248 10.7043 9.79603C10.7036 8.81633 10.8276 7.84064 11.0732 6.89312L2.80432 15.2807C1.00385 17.1201 -0.00454786 19.6085 1.54203e-05 22.2005C0.00457872 24.7926 1.02173 27.2772 2.82866 29.11C4.6356 30.9429 7.08502 31.9746 9.64039 31.9791C12.1958 31.9838 14.6488 30.9609 16.4621 29.1345L20.8039 24.7303L19.3821 23.2895Z" fill="#10B981"/><path d="M34.1052 32C32.837 32.0021 31.5809 31.7502 30.4091 31.2584C29.2373 30.7669 28.1726 30.0451 27.2765 29.1349L15.0401 16.7226C13.2331 14.8846 12.2192 12.3942 12.221 9.79851C12.2228 7.20278 13.2402 4.71389 15.0497 2.87846C16.8592 1.04304 19.3129 0.0111466 21.872 0.00940821C24.4309 0.00766985 26.886 1.03623 28.6978 2.86919L40.9343 15.2814C42.2855 16.6508 43.2059 18.396 43.5789 20.2964C43.9521 22.1966 43.7608 24.1664 43.0297 25.9564C42.2985 27.7464 41.0603 29.276 39.4716 30.352C37.883 31.4278 36.0154 32.0012 34.1052 32ZM28.6978 27.6937C30.1356 29.1311 32.0753 29.9335 34.094 29.9261C36.1126 29.9187 38.0466 29.1019 39.4741 27.6539C40.9015 26.2061 41.7067 24.2443 41.714 22.1967C41.7212 20.149 40.9302 18.1813 39.5131 16.723L27.2767 4.31075C26.5683 3.5818 25.7249 3.00222 24.7948 2.60541C23.8648 2.2086 22.8665 2.00241 21.8576 1.9987C20.8485 1.99497 19.8488 2.19383 18.9159 2.58378C17.9831 2.97373 17.1355 3.5471 16.422 4.27081C15.7085 4.99452 15.1433 5.85428 14.7589 6.80057C14.3744 7.74686 14.1784 8.76095 14.1821 9.78442C14.1857 10.8079 14.389 11.8205 14.7802 12.764C15.1714 13.7074 15.7427 14.563 16.4614 15.2814L28.6978 27.6937Z" fill="#10B981"/><path d="M39.5138 2.86921L35.1719 7.27343L36.5931 8.71498L40.9349 4.31076C42.3727 2.87337 44.3124 2.07089 46.3311 2.07831C48.3497 2.08574 50.2837 2.90247 51.7112 4.35043C53.1386 5.79838 53.9438 7.76007 53.9511 9.80776C53.9583 11.8555 53.1673 13.823 51.7502 15.2814L45.2599 21.865C45.2927 22.9626 45.1689 24.0593 44.8924 25.1209L53.1714 16.723C54.9825 14.8859 56 12.3942 56 9.7961C56 7.19801 54.9825 4.70635 53.1714 2.86921C51.3602 1.03209 48.9039 0 46.3425 0C43.7813 0 41.3249 1.03209 39.5138 2.86921Z" fill="#10B981"/></svg>',
  mono: '<svg viewBox="0 0 256 256" fill="none" xmlns="http://www.w3.org/2000/svg"><rect width="256" height="256" rx="48" fill="#FFFFFF"/><g transform="translate(28,71) scale(3.57)"><path d="M19.3821 23.2895L15.0401 27.6937C13.6029 29.134 11.6622 29.9391 9.64192 29.933C7.62159 29.9268 5.68572 29.11 4.25711 27.6609C2.8285 26.2118 2.02321 24.2481 2.01713 22.1987C2.01102 20.1493 2.80462 18.1808 4.22457 16.723L10.7099 10.1445C10.7066 10.0286 10.7043 9.91248 10.7043 9.79603C10.7036 8.81633 10.8276 7.84064 11.0732 6.89312L2.80432 15.2807C1.00385 17.1201 -0.00454786 19.6085 1.54203e-05 22.2005C0.00457872 24.7926 1.02173 27.2772 2.82866 29.11C4.6356 30.9429 7.08502 31.9746 9.64039 31.9791C12.1958 31.9838 14.6488 30.9609 16.4621 29.1345L20.8039 24.7303L19.3821 23.2895Z" fill="#0A0A0A"/><path d="M34.1052 32C32.837 32.0021 31.5809 31.7502 30.4091 31.2584C29.2373 30.7669 28.1726 30.0451 27.2765 29.1349L15.0401 16.7226C13.2331 14.8846 12.2192 12.3942 12.221 9.79851C12.2228 7.20278 13.2402 4.71389 15.0497 2.87846C16.8592 1.04304 19.3129 0.0111466 21.872 0.00940821C24.4309 0.00766985 26.886 1.03623 28.6978 2.86919L40.9343 15.2814C42.2855 16.6508 43.2059 18.396 43.5789 20.2964C43.9521 22.1966 43.7608 24.1664 43.0297 25.9564C42.2985 27.7464 41.0603 29.276 39.4716 30.352C37.883 31.4278 36.0154 32.0012 34.1052 32ZM28.6978 27.6937C30.1356 29.1311 32.0753 29.9335 34.094 29.9261C36.1126 29.9187 38.0466 29.1019 39.4741 27.6539C40.9015 26.2061 41.7067 24.2443 41.714 22.1967C41.7212 20.149 40.9302 18.1813 39.5131 16.723L27.2767 4.31075C26.5683 3.5818 25.7249 3.00222 24.7948 2.60541C23.8648 2.2086 22.8665 2.00241 21.8576 1.9987C20.8485 1.99497 19.8488 2.19383 18.9159 2.58378C17.9831 2.97373 17.1355 3.5471 16.422 4.27081C15.7085 4.99452 15.1433 5.85428 14.7589 6.80057C14.3744 7.74686 14.1784 8.76095 14.1821 9.78442C14.1857 10.8079 14.389 11.8205 14.7802 12.764C15.1714 13.7074 15.7427 14.563 16.4614 15.2814L28.6978 27.6937Z" fill="#0A0A0A"/><path d="M39.5138 2.86921L35.1719 7.27343L36.5931 8.71498L40.9349 4.31076C42.3727 2.87337 44.3124 2.07089 46.3311 2.07831C48.3497 2.08574 50.2837 2.90247 51.7112 4.35043C53.1386 5.79838 53.9438 7.76007 53.9511 9.80776C53.9583 11.8555 53.1673 13.823 51.7502 15.2814L45.2599 21.865C45.2927 22.9626 45.1689 24.0593 44.8924 25.1209L53.1714 16.723C54.9825 14.8859 56 12.3942 56 9.7961C56 7.19801 54.9825 4.70635 53.1714 2.86921C51.3602 1.03209 48.9039 0 46.3425 0C43.7813 0 41.3249 1.03209 39.5138 2.86921Z" fill="#0A0A0A"/></g></svg>',
  iconMono:
    '<svg viewBox="0 0 56 32" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M19.3821 23.2895L15.0401 27.6937C13.6029 29.134 11.6622 29.9391 9.64192 29.933C7.62159 29.9268 5.68572 29.11 4.25711 27.6609C2.8285 26.2118 2.02321 24.2481 2.01713 22.1987C2.01102 20.1493 2.80462 18.1808 4.22457 16.723L10.7099 10.1445C10.7066 10.0286 10.7043 9.91248 10.7043 9.79603C10.7036 8.81633 10.8276 7.84064 11.0732 6.89312L2.80432 15.2807C1.00385 17.1201 -0.00454786 19.6085 1.54203e-05 22.2005C0.00457872 24.7926 1.02173 27.2772 2.82866 29.11C4.6356 30.9429 7.08502 31.9746 9.64039 31.9791C12.1958 31.9838 14.6488 30.9609 16.4621 29.1345L20.8039 24.7303L19.3821 23.2895Z" fill="#FFFFFF"/><path d="M34.1052 32C32.837 32.0021 31.5809 31.7502 30.4091 31.2584C29.2373 30.7669 28.1726 30.0451 27.2765 29.1349L15.0401 16.7226C13.2331 14.8846 12.2192 12.3942 12.221 9.79851C12.2228 7.20278 13.2402 4.71389 15.0497 2.87846C16.8592 1.04304 19.3129 0.0111466 21.872 0.00940821C24.4309 0.00766985 26.886 1.03623 28.6978 2.86919L40.9343 15.2814C42.2855 16.6508 43.2059 18.396 43.5789 20.2964C43.9521 22.1966 43.7608 24.1664 43.0297 25.9564C42.2985 27.7464 41.0603 29.276 39.4716 30.352C37.883 31.4278 36.0154 32.0012 34.1052 32ZM28.6978 27.6937C30.1356 29.1311 32.0753 29.9335 34.094 29.9261C36.1126 29.9187 38.0466 29.1019 39.4741 27.6539C40.9015 26.2061 41.7067 24.2443 41.714 22.1967C41.7212 20.149 40.9302 18.1813 39.5131 16.723L27.2767 4.31075C26.5683 3.5818 25.7249 3.00222 24.7948 2.60541C23.8648 2.2086 22.8665 2.00241 21.8576 1.9987C20.8485 1.99497 19.8488 2.19383 18.9159 2.58378C17.9831 2.97373 17.1355 3.5471 16.422 4.27081C15.7085 4.99452 15.1433 5.85428 14.7589 6.80057C14.3744 7.74686 14.1784 8.76095 14.1821 9.78442C14.1857 10.8079 14.389 11.8205 14.7802 12.764C15.1714 13.7074 15.7427 14.563 16.4614 15.2814L28.6978 27.6937Z" fill="#FFFFFF"/><path d="M39.5138 2.86921L35.1719 7.27343L36.5931 8.71498L40.9349 4.31076C42.3727 2.87337 44.3124 2.07089 46.3311 2.07831C48.3497 2.08574 50.2837 2.90247 51.7112 4.35043C53.1386 5.79838 53.9438 7.76007 53.9511 9.80776C53.9583 11.8555 53.1673 13.823 51.7502 15.2814L45.2599 21.865C45.2927 22.9626 45.1689 24.0593 44.8924 25.1209L53.1714 16.723C54.9825 14.8859 56 12.3942 56 9.7961C56 7.19801 54.9825 4.70635 53.1714 2.86921C51.3602 1.03209 48.9039 0 46.3425 0C43.7813 0 41.3249 1.03209 39.5138 2.86921Z" fill="#FFFFFF"/></svg>',
};

function lucideSvg(
  Icon: React.ComponentType<{
    size?: number;
    color?: string;
    strokeWidth?: number;
    className?: string;
  }>,
  color = "#10B981",
) {
  return renderToStaticMarkup(
    <Icon size={96} color={color} strokeWidth={1.8} />,
  );
}

const CORE_ASSETS: AssetItem[] = [
  {
    id: "forge-logo-primary",
    name: "Forge8004 Logo",
    family: "Core mark",
    note: "Primary mark — emerald rounded square with dark chain-link symbol.",
    svg: LOGO_SVGS.primary,
    preview: <ForgeLogo className="h-full w-full" />,
    pngSize: 1600,
  },
  {
    id: "forge-icon-primary",
    name: "Forge8004 Icon",
    family: "Core symbol",
    note: "Standalone emerald chain-link mark for compact surfaces and icon-led layouts.",
    svg: LOGO_SVGS.icon,
    preview: <ForgeIcon className="h-24 w-auto" />,
    pngSize: 1600,
    previewClassName: "h-24 w-auto",
  },
  {
    id: "forge-logo-mono",
    name: "Forge8004 Logo Mono",
    family: "Core mark",
    note: "White rounded square with dark chain-link for light backgrounds and print.",
    svg: LOGO_SVGS.mono,
    preview: <ForgeLogoMono className="h-full w-full" />,
    pngSize: 1600,
  },
  {
    id: "forge-icon-mono",
    name: "Forge8004 Icon Mono",
    family: "Core symbol",
    note: "White chain-link mark for dark backgrounds and single-color applications.",
    svg: LOGO_SVGS.iconMono,
    preview: <ForgeIconMono className="h-24 w-auto" />,
    pngSize: 1600,
    previewClassName: "h-24 w-auto",
  },
];

const UI_ASSETS: AssetItem[] = [
  {
    id: "home",
    name: "Home",
    family: "Navigation",
    note: "Main site home link.",
    svg: lucideSvg(Home),
    preview: (
      <Home className="h-11 w-11 text-emerald-cyber" strokeWidth={1.8} />
    ),
  },
  {
    id: "workflow",
    name: "How It Works",
    family: "Navigation",
    note: "Explainer and product flow navigation.",
    svg: lucideSvg(Workflow),
    preview: (
      <Workflow className="h-11 w-11 text-emerald-cyber" strokeWidth={1.8} />
    ),
  },
  {
    id: "shield-check",
    name: "Trust Center",
    family: "Navigation",
    note: "Trust and safety navigation marker.",
    svg: lucideSvg(ShieldCheck),
    preview: (
      <ShieldCheck className="h-11 w-11 text-emerald-cyber" strokeWidth={1.8} />
    ),
  },
  {
    id: "console",
    name: "Console",
    family: "Navigation",
    note: "Operator console menu icon.",
    svg: lucideSvg(LayoutDashboard),
    preview: (
      <LayoutDashboard
        className="h-11 w-11 text-emerald-cyber"
        strokeWidth={1.8}
      />
    ),
  },
  {
    id: "agents",
    name: "Agents",
    family: "Navigation",
    note: "Agent registry and list views.",
    svg: lucideSvg(Users),
    preview: (
      <Users className="h-11 w-11 text-emerald-cyber" strokeWidth={1.8} />
    ),
  },
  {
    id: "docs",
    name: "Docs",
    family: "Navigation",
    note: "Documentation and support pages.",
    svg: lucideSvg(FileText),
    preview: (
      <FileText className="h-11 w-11 text-emerald-cyber" strokeWidth={1.8} />
    ),
  },
  {
    id: "contact",
    name: "Contact",
    family: "Navigation",
    note: "Contact and outreach entry point.",
    svg: lucideSvg(Mail),
    preview: (
      <Mail className="h-11 w-11 text-emerald-cyber" strokeWidth={1.8} />
    ),
  },
  {
    id: "layers",
    name: "Workspace",
    family: "Product UI",
    note: "Used in product, pitch, and layered workspace messaging.",
    svg: lucideSvg(Layers),
    preview: (
      <Layers className="h-11 w-11 text-emerald-cyber" strokeWidth={1.8} />
    ),
  },
  {
    id: "monitor-smartphone",
    name: "Responsive",
    family: "Product UI",
    note: "Used for device and format messaging.",
    svg: lucideSvg(MonitorSmartphone),
    preview: (
      <MonitorSmartphone
        className="h-11 w-11 text-emerald-cyber"
        strokeWidth={1.8}
      />
    ),
  },
  {
    id: "search",
    name: "Search",
    family: "Product UI",
    note: "Search and content discovery states.",
    svg: lucideSvg(Search),
    preview: (
      <Search className="h-11 w-11 text-emerald-cyber" strokeWidth={1.8} />
    ),
  },
  {
    id: "download",
    name: "Download",
    family: "Product UI",
    note: "Used across export and asset actions.",
    svg: lucideSvg(Download),
    preview: (
      <Download className="h-11 w-11 text-emerald-cyber" strokeWidth={1.8} />
    ),
  },
  {
    id: "sparkles",
    name: "Sparkles",
    family: "Product UI",
    note: "Used for creative, deck, and premium accent moments.",
    svg: lucideSvg(Sparkles),
    preview: (
      <Sparkles className="h-11 w-11 text-emerald-cyber" strokeWidth={1.8} />
    ),
  },
  {
    id: "activity",
    name: "Activity",
    family: "Signals & Trust",
    note: "Live status, engine motion, and telemetry accents.",
    svg: lucideSvg(Activity),
    preview: (
      <Activity className="h-11 w-11 text-emerald-cyber" strokeWidth={1.8} />
    ),
  },
  {
    id: "shield",
    name: "Risk Shield",
    family: "Signals & Trust",
    note: "Risk router, protection, and safety messaging.",
    svg: lucideSvg(Shield),
    preview: (
      <Shield className="h-11 w-11 text-emerald-cyber" strokeWidth={1.8} />
    ),
  },
  {
    id: "radar",
    name: "Trust Timeline",
    family: "Signals & Trust",
    note: "Used in trust layer and sequence storytelling.",
    svg: lucideSvg(Radar),
    preview: (
      <Radar className="h-11 w-11 text-emerald-cyber" strokeWidth={1.8} />
    ),
  },
  {
    id: "target",
    name: "Target",
    family: "Signals & Trust",
    note: "Roadmap, objectives, and precision states.",
    svg: lucideSvg(Target),
    preview: (
      <Target className="h-11 w-11 text-emerald-cyber" strokeWidth={1.8} />
    ),
  },
  {
    id: "trending-up",
    name: "Trending Up",
    family: "Signals & Trust",
    note: "Trading, growth, and market movement states.",
    svg: lucideSvg(TrendingUp),
    preview: (
      <TrendingUp className="h-11 w-11 text-emerald-cyber" strokeWidth={1.8} />
    ),
  },
  {
    id: "bar-chart",
    name: "Bar Chart",
    family: "Signals & Trust",
    note: "Metrics, charts, and market opportunity views.",
    svg: lucideSvg(BarChart3),
    preview: (
      <BarChart3 className="h-11 w-11 text-emerald-cyber" strokeWidth={1.8} />
    ),
  },
  {
    id: "check-circle",
    name: "Check Circle",
    family: "Signals & Trust",
    note: "Approved states and completion markers.",
    svg: lucideSvg(CheckCircle2),
    preview: (
      <CheckCircle2
        className="h-11 w-11 text-emerald-cyber"
        strokeWidth={1.8}
      />
    ),
  },
  {
    id: "zap",
    name: "Zap",
    family: "Signals & Trust",
    note: "Action triggers, energy, and active systems.",
    svg: lucideSvg(Zap),
    preview: <Zap className="h-11 w-11 text-emerald-cyber" strokeWidth={1.8} />,
  },
  {
    id: "globe",
    name: "Globe",
    family: "Signals & Trust",
    note: "Used for market timing and broad ecosystem context.",
    svg: lucideSvg(Globe),
    preview: (
      <Globe className="h-11 w-11 text-emerald-cyber" strokeWidth={1.8} />
    ),
  },
  {
    id: "palette",
    name: "Palette",
    family: "Creative",
    note: "Brand, identity, and design-system pages.",
    svg: lucideSvg(Palette),
    preview: (
      <Palette className="h-11 w-11 text-emerald-cyber" strokeWidth={1.8} />
    ),
  },
  {
    id: "type",
    name: "Type",
    family: "Creative",
    note: "Typography and copy-driven sections.",
    svg: lucideSvg(Type),
    preview: (
      <Type className="h-11 w-11 text-emerald-cyber" strokeWidth={1.8} />
    ),
  },
  {
    id: "layout",
    name: "Layout",
    family: "Creative",
    note: "Presentation, banner, and composition views.",
    svg: lucideSvg(Layout),
    preview: (
      <Layout className="h-11 w-11 text-emerald-cyber" strokeWidth={1.8} />
    ),
  },
  {
    id: "file-image",
    name: "Media Asset",
    family: "Creative",
    note: "Used for brand, image, and asset sections.",
    svg: lucideSvg(FileImage),
    preview: (
      <FileImage className="h-11 w-11 text-emerald-cyber" strokeWidth={1.8} />
    ),
  },
  {
    id: "external-link",
    name: "External Link",
    family: "Creative",
    note: "Outbound links and extra resource links.",
    svg: lucideSvg(ExternalLink),
    preview: (
      <ExternalLink
        className="h-11 w-11 text-emerald-cyber"
        strokeWidth={1.8}
      />
    ),
  },
  {
    id: "arrow-right",
    name: "Arrow Right",
    family: "Creative",
    note: "Directional CTA and story progression.",
    svg: lucideSvg(ArrowRight),
    preview: (
      <ArrowRight className="h-11 w-11 text-emerald-cyber" strokeWidth={1.8} />
    ),
  },
];

const ASSET_GROUPS = [
  {
    title: "Core Marks",
    description: "Primary brand marks and symbols used throughout Forge8004.",
    items: CORE_ASSETS,
  },
  {
    title: "Navigation & Product Icons",
    description:
      "The SVG icons that show up across navigation, trust, deck, and product UI surfaces.",
    items: UI_ASSETS,
  },
];

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

const AssetCard: React.FC<{
  asset: AssetItem;
  copied: string | null;
  onCopy: (asset: AssetItem) => void;
  onDownloadSvg: (asset: AssetItem) => void;
  onDownloadPng: (asset: AssetItem) => void;
}> = ({ asset, copied, onCopy, onDownloadSvg, onDownloadPng }) => {
  return (
    <div className="glass-panel border border-border-subtle p-6 transition-all hover:border-emerald-cyber/30">
      <div className="flex aspect-square items-center justify-center border border-border-subtle bg-zinc-deep/60 p-10">
        <div className={asset.previewClassName ?? "h-24 w-24"}>
          {asset.preview}
        </div>
      </div>

      <div className="mt-5 space-y-2">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-sm font-mono font-bold uppercase tracking-[0.12em] text-white">
              {asset.name}
            </h3>
            <p className="mt-1 text-[10px] font-mono uppercase tracking-[0.22em] text-emerald-cyber">
              {asset.family}
            </p>
          </div>
        </div>
        <p className="text-[11px] font-mono uppercase leading-relaxed tracking-[0.08em] text-zinc-400">
          {asset.note}
        </p>
      </div>

      <div className="mt-5 grid grid-cols-3 gap-2">
        <button
          onClick={() => onDownloadSvg(asset)}
          className="inline-flex items-center justify-center gap-2 border border-border-subtle bg-obsidian px-3 py-3 text-[9px] font-mono uppercase tracking-[0.2em] text-zinc-300 transition hover:border-emerald-cyber/30 hover:text-emerald-cyber"
        >
          <Download className="h-3 w-3" />
          SVG
        </button>
        <button
          onClick={() => onDownloadPng(asset)}
          className="inline-flex items-center justify-center gap-2 border border-border-subtle bg-obsidian px-3 py-3 text-[9px] font-mono uppercase tracking-[0.2em] text-zinc-300 transition hover:border-emerald-cyber/30 hover:text-emerald-cyber"
        >
          <Download className="h-3 w-3" />
          PNG
        </button>
        <button
          onClick={() => onCopy(asset)}
          className="inline-flex items-center justify-center gap-2 border border-border-subtle bg-obsidian px-3 py-3 text-[9px] font-mono uppercase tracking-[0.2em] text-zinc-300 transition hover:border-emerald-cyber/30 hover:text-emerald-cyber"
        >
          {copied === asset.id ? (
            <Check className="h-3 w-3" />
          ) : (
            <Copy className="h-3 w-3" />
          )}
          {copied === asset.id ? "COPIED" : "COPY"}
        </button>
      </div>
    </div>
  );
};

export default function BrandKit() {
  const [copied, setCopied] = React.useState<string | null>(null);

  const copyToClipboard = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(id);
      window.setTimeout(() => setCopied(null), 1800);
    } catch (error) {
      console.error("Copy failed:", error);
    }
  };

  const handleDownloadSvg = (asset: AssetItem) => {
    downloadBlob(
      new Blob([asset.svg], { type: "image/svg+xml;charset=utf-8" }),
      `${asset.id}.svg`,
    );
  };

  const handleDownloadPng = async (asset: AssetItem) => {
    try {
      const svgBlob = new Blob([asset.svg], {
        type: "image/svg+xml;charset=utf-8",
      });
      const url = URL.createObjectURL(svgBlob);
      const img = new Image();

      img.onload = () => {
        const size = asset.pngSize ?? 1024;
        const canvas = document.createElement("canvas");
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext("2d");

        if (ctx) {
          ctx.clearRect(0, 0, size, size);
          ctx.drawImage(img, 0, 0, size, size);
          canvas.toBlob((blob) => {
            if (blob) {
              downloadBlob(blob, `${asset.id}.png`);
            }
          }, "image/png");
        }

        URL.revokeObjectURL(url);
      };

      img.src = url;
    } catch (error) {
      console.error("PNG export failed:", error);
    }
  };

  return (
    <div className="page-shell space-y-16 pb-20">
      <section className="glass-panel space-y-8 p-8 sm:p-10">
        <div className="flex items-center gap-3">
          <div className="h-2 w-2 bg-emerald-cyber" />
          <span className="text-[10px] font-mono uppercase tracking-[0.3em] text-emerald-cyber">
            Brand Kit // Asset Library
          </span>
        </div>

        <div className="grid gap-8 lg:grid-cols-[1.15fr_0.85fr] lg:items-end">
          <div>
            <h1 className="text-4xl font-mono font-bold uppercase leading-[0.92] text-white sm:text-5xl lg:text-6xl">
              Forge8004 icons,
              <span className="block text-emerald-cyber">
                logos, and core assets
              </span>
            </h1>
            <p className="mt-5 max-w-3xl text-sm font-mono uppercase leading-relaxed tracking-[0.08em] text-zinc-400 sm:text-base">
              This page now includes the brand marks and the SVG icon set the
              product keeps using, so you can download each asset as SVG or PNG
              without rebuilding them by hand.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {[
              ["Core marks", String(CORE_ASSETS.length)],
              ["UI icons", String(UI_ASSETS.length)],
              ["Formats", "SVG + PNG"],
              ["Use cases", "Brand / Product / Deck"],
            ].map(([label, value]) => (
              <div
                key={label}
                className="border border-border-subtle bg-zinc-deep/40 p-4"
              >
                <p className="text-[9px] font-mono uppercase tracking-[0.22em] text-zinc-600">
                  {label}
                </p>
                <p className="mt-3 text-lg font-mono font-bold uppercase text-white">
                  {value}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {ASSET_GROUPS.map((group) => (
        <section key={group.title} className="space-y-8">
          <div className="flex flex-col gap-3 border-b border-border-subtle pb-5 md:flex-row md:items-end md:justify-between">
            <div>
              <h2 className="text-2xl font-mono font-bold uppercase tracking-tight text-white">
                {group.title}
              </h2>
              <p className="mt-2 max-w-3xl text-[11px] font-mono uppercase tracking-[0.08em] text-zinc-500">
                {group.description}
              </p>
            </div>
            <p className="text-[10px] font-mono uppercase tracking-[0.24em] text-zinc-600">
              {group.items.length} downloadable assets
            </p>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
            {group.items.map((asset) => (
              <AssetCard
                key={asset.id}
                asset={asset}
                copied={copied}
                onCopy={(currentAsset) =>
                  copyToClipboard(currentAsset.svg, currentAsset.id)
                }
                onDownloadSvg={handleDownloadSvg}
                onDownloadPng={handleDownloadPng}
              />
            ))}
          </div>
        </section>
      ))}

      <section className="space-y-8">
        <div className="flex flex-col gap-3 border-b border-border-subtle pb-5 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 className="text-2xl font-mono font-bold uppercase tracking-tight text-white">
              Color Palette
            </h2>
            <p className="mt-2 text-[11px] font-mono uppercase tracking-[0.08em] text-zinc-500">
              Core product colors and where they are meant to be used.
            </p>
          </div>
          <p className="text-[10px] font-mono uppercase tracking-[0.24em] text-zinc-600">
            Copy hex values
          </p>
        </div>

        <div className="grid grid-cols-2 gap-px border border-border-subtle bg-border-subtle md:grid-cols-4 xl:grid-cols-8">
          {COLORS.map((color) => (
            <div key={color.hex} className="bg-obsidian p-5">
              <div
                className="aspect-square border border-white/5"
                style={{ backgroundColor: color.hex }}
              />
              <div className="mt-4 space-y-1">
                <h3 className="text-[10px] font-mono font-bold uppercase tracking-[0.16em] text-white">
                  {color.name}
                </h3>
                <p className="text-[9px] font-mono uppercase tracking-[0.12em] text-zinc-600">
                  {color.usage}
                </p>
              </div>
              <button
                onClick={() => copyToClipboard(color.hex, color.hex)}
                className="mt-4 inline-flex items-center gap-2 text-[10px] font-mono uppercase tracking-[0.16em] text-zinc-400 transition hover:text-emerald-cyber"
              >
                {copied === color.hex ? (
                  <Check className="h-3 w-3" />
                ) : (
                  <Copy className="h-3 w-3" />
                )}
                {color.hex}
              </button>
            </div>
          ))}
        </div>
      </section>

      <div className="grid gap-10 lg:grid-cols-2">
        <section className="space-y-8">
          <div className="flex items-center gap-3 border-b border-border-subtle pb-5">
            <Type className="h-5 w-5 text-emerald-cyber" />
            <h2 className="text-2xl font-mono font-bold uppercase tracking-tight text-white">
              Typography
            </h2>
          </div>

          <div className="glass-panel p-8">
            <div className="space-y-6">
              <div>
                <p className="text-[9px] font-mono uppercase tracking-[0.24em] text-zinc-600">
                  Interface Sans
                </p>
                <p className="mt-3 text-4xl tracking-tight text-white">
                  Forge8004 keeps the reading calm.
                </p>
                <p className="mt-3 text-sm leading-relaxed text-zinc-500">
                  Use the clean sans style for body copy, descriptions, and
                  general reading comfort.
                </p>
              </div>

              <div className="h-px bg-border-subtle" />

              <div>
                <p className="text-[9px] font-mono uppercase tracking-[0.24em] text-zinc-600">
                  Technical Mono
                </p>
                <p className="mt-3 text-3xl font-mono uppercase tracking-[0.12em] text-emerald-cyber">
                  TRUST // SIGNAL // CONTROL
                </p>
                <p className="mt-3 text-[11px] font-mono uppercase leading-relaxed tracking-[0.08em] text-zinc-500">
                  Use the mono style for labels, deck titles, data points, and
                  interface accents.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="space-y-8">
          <div className="flex items-center gap-3 border-b border-border-subtle pb-5">
            <Layout className="h-5 w-5 text-emerald-cyber" />
            <h2 className="text-2xl font-mono font-bold uppercase tracking-tight text-white">
              Usage Notes
            </h2>
          </div>

          <div className="glass-panel p-8 space-y-6">
            {[
              [
                "Use SVG first",
                "SVG is the clean master format for decks, docs, export, and print-ready use.",
              ],
              [
                "Use PNG when needed",
                "PNG is best for social posts, slide apps, and tools that do not like SVG.",
              ],
              [
                "Keep the accent clean",
                "Use Emerald Cyber for the core marks unless you deliberately need a mono variant.",
              ],
              [
                "Stay consistent",
                "Use the same icon families across docs, deck, and product screens so the brand feels cohesive.",
              ],
            ].map(([title, desc]) => (
              <div
                key={title}
                className="border border-border-subtle bg-zinc-deep/30 p-4"
              >
                <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-emerald-cyber">
                  {title}
                </p>
                <p className="mt-3 text-[11px] font-mono uppercase tracking-[0.08em] text-zinc-400">
                  {desc}
                </p>
              </div>
            ))}

            <a
              href="/contact"
              className="inline-flex items-center gap-2 text-[10px] font-mono uppercase tracking-[0.24em] text-emerald-cyber transition hover:underline"
            >
              Need a custom lockup or icon pack?
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        </section>
      </div>
    </div>
  );
}
