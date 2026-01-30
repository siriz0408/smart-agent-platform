/**
 * Design Tokens for Smart Agent
 * Combining Glean's clean enterprise aesthetic with Zillow's bold property cards
 */

export const DESIGN_TOKENS = {
  /**
   * Color Palette
   * Primary: Glean purple for navigation and primary actions
   * CTA Blue: Zillow blue for call-to-action buttons
   */
  colors: {
    // Glean-inspired purple
    primary: '#6B5CE7',
    primaryHover: '#5B4CD7',
    primaryLight: 'rgba(107, 92, 231, 0.1)',

    // Zillow-inspired blue for CTAs
    ctaBlue: '#006AFF',
    ctaBlueHover: '#0056CC',

    // Status colors
    success: '#10B981',
    warning: '#F59E0B',
    error: '#EF4444',
    info: '#3B82F6',

    // Zillow property badges
    zillowOrange: '#FF6B35',
  },

  /**
   * Spacing
   * Mobile-first with desktop enhancements
   */
  spacing: {
    mobile: {
      page: 'p-4',
      card: 'p-3',
      section: 'space-y-4',
      gap: 'gap-3',
    },
    desktop: {
      page: 'md:p-6 lg:p-8',
      card: 'md:p-4 lg:p-6',
      section: 'md:space-y-6 lg:space-y-8',
      gap: 'md:gap-4 lg:gap-6',
    },
    // Glean-style generous spacing
    glean: {
      sidebarPadding: 'p-4',
      cardGap: 'gap-6',
      sectionGap: 'space-y-8',
    },
  },

  /**
   * Touch Targets (iOS/Android compliance)
   * Minimum: 44px (WCAG 2.5.5)
   * Comfortable: 48px
   * FAB: 56px
   */
  touchTargets: {
    minimum: 'h-11 w-11',        // 44px
    comfortable: 'h-12 w-12',    // 48px
    fab: 'h-14 w-14',            // 56px

    // Mobile navigation heights
    bottomNav: 'h-16',           // 64px
    mobileHeader: 'h-14',        // 56px
  },

  /**
   * Typography Scale
   * Zillow: Bold prices
   * Glean: Clean, readable content
   */
  typography: {
    // Zillow-style bold prices
    price: 'text-3xl font-bold',
    priceSmall: 'text-2xl font-bold',

    // Page headers
    h1: 'text-2xl md:text-3xl font-semibold',
    h2: 'text-xl md:text-2xl font-semibold',
    h3: 'text-lg font-semibold',

    // Card headers
    cardTitle: 'text-lg font-semibold',
    cardSubtitle: 'text-base font-medium',

    // Body text
    body: 'text-base',
    bodySmall: 'text-sm',

    // Metadata (gray, smaller)
    metadata: 'text-sm text-muted-foreground',
    metadataSmall: 'text-xs text-muted-foreground',

    // Zillow inline stats
    stats: 'text-sm font-medium',
    statsSeparator: 'text-muted-foreground',

    // Mobile nav labels
    navLabel: 'text-[10px] font-medium',
  },

  /**
   * Card Styles
   * Clean white cards with subtle shadows (Glean + Zillow)
   */
  cards: {
    // Base card
    default: 'bg-white dark:bg-card rounded-xl shadow-sm border border-border',

    // Hover states
    hover: 'hover:shadow-md transition-shadow duration-200',
    hoverLift: 'hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200',

    // Images
    image: 'aspect-video object-cover rounded-t-xl',
    imageSquare: 'aspect-square object-cover rounded-t-xl',

    // Glean-style colored icon backgrounds
    iconBackground: 'h-12 w-12 rounded-lg flex items-center justify-center',

    // Zillow property card
    propertyCard: 'overflow-hidden rounded-xl shadow-sm hover:shadow-lg transition-shadow cursor-pointer',
  },

  /**
   * Glean Navigation Tokens
   */
  gleanSidebar: {
    width: 'w-[72px]',
    background: 'bg-[#6B5CE7]',
    textColor: 'text-white',
    activeBackground: 'bg-white/20',
    hoverBackground: 'hover:bg-white/10',
    inactiveText: 'text-white/70',
    itemPadding: 'py-3 px-2',
    itemGap: 'gap-1',
    logoBackground: 'bg-white/20',
  },

  /**
   * Mobile Bottom Navigation
   */
  mobileNav: {
    height: 'h-16',
    background: 'bg-white dark:bg-card',
    activeColor: 'text-[#6B5CE7]',
    inactiveColor: 'text-muted-foreground',
    iconSize: 'h-6 w-6',
    labelSize: 'text-[10px]',
  },

  /**
   * Avatar Sizes (Glean people grid)
   */
  avatars: {
    small: 'h-8 w-8',
    medium: 'h-10 w-10',
    large: 'h-16 w-16',
    gleanPeople: 'h-24 w-24',          // Glean people grid size
  },

  /**
   * Zillow Property-Specific Tokens
   */
  zillow: {
    badgeOverlay: 'absolute top-3 left-3',
    saveButton: 'absolute top-3 right-3 h-10 w-10 rounded-full bg-white/90 hover:bg-white',
    photoCount: 'absolute bottom-3 right-3 bg-black/60 text-white text-xs px-2 py-1 rounded',
    statsSeparator: '|',
  },

  /**
   * Safe Area (iOS notch support)
   */
  safeArea: {
    bottomNav: 'pb-safe',
    topBar: 'pt-safe',
  },
} as const;

/**
 * Utility function to generate icon background color
 * Glean uses different colors for different content types
 */
export function getIconBackgroundColor(type: string): string {
  const colors = {
    document: 'bg-gradient-to-br from-blue-400 to-blue-600',
    contact: 'bg-gradient-to-br from-purple-400 to-purple-600',
    property: 'bg-gradient-to-br from-green-400 to-green-600',
    agent: 'bg-gradient-to-br from-orange-400 to-orange-600',
    deal: 'bg-gradient-to-br from-pink-400 to-pink-600',
    message: 'bg-gradient-to-br from-indigo-400 to-indigo-600',
  };

  return colors[type as keyof typeof colors] || 'bg-gradient-to-br from-gray-400 to-gray-600';
}

/**
 * Category colors for badges (documents, properties)
 */
export const CATEGORY_COLORS = {
  contract: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
  disclosure: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
  inspection: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300',
  appraisal: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
  title: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300',
  other: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300',
} as const;
