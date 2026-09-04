export {
  FluentShell,
  FLUENT_SHELL_VERSION,
  SURFACE_RULES,
  detectHostSurface,
  useHostSurface,
  useShellSurface,
  useShellBleed,
  measureAlignment,
  readAlignmentAgainst,
  collectHostChain,
  collectShellDiagnostics,
  logShellDiagnostics,
  isShellDebugEnabled,
} from './FluentShell';
export type {
  AlignmentReading,
  EdgeComparison,
  HostAncestor,
  HostChain,
  HostSurfaceInfo,
  PaintedCard,
  ShellDebugApi,
  ShellDiagnostics,
} from './FluentShell';
export type {
  ChainStop,
  FluentShellProps,
  HostSurface,
  ShellDensity,
  ShellSpacing,
  SpacingBasis,
  SpacingStrategy,
} from './FluentShell.types';
