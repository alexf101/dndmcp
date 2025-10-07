// Design system theme with consistent tokens

export const theme = {
  colors: {
    // Brand colors
    primary: '#d4af37', // Gold - main brand color
    primaryHover: '#c4a147', // Darker gold for hover states

    // Background colors
    background: {
      body: '#242424', // Main app background
      surface: '#1a1a1a', // Cards, panels, containers
      surfaceHover: '#333', // Hover states for interactive surfaces
      input: '#000', // Input fields, textareas
      button: '#333', // Default button background
      buttonHover: '#555', // Button hover state
    },

    // Text colors (ordered by contrast level)
    text: {
      primary: '#f0f0f0', // Highest contrast - labels, headings
      secondary: '#e0e0e0', // High contrast - body text, main content
      tertiary: '#bbb', // Medium contrast - secondary info
      quaternary: '#aaa', // Lower contrast - subtle text, IDs
      muted: '#888', // Lowest contrast - disabled, very subtle
    },

    // Status colors
    status: {
      success: '#4CAF50', // Green - current turn indicator
      warning: '#ff9800', // Orange - critical HP
      danger: '#f44336', // Red - dead creatures, errors
      info: '#06c', // Blue - loading states
      warningBg: '#ffeb3b', // Yellow - wounded creatures
    },

    // Semantic colors
    error: {
      background: '#fee',
      text: '#c00',
      border: '#fcc',
    },

    loading: {
      background: '#eff',
      text: '#06c',
      border: '#ccf',
    },

    // Interactive states
    interactive: {
      border: '#666', // Default borders
      borderHover: '#646cff', // Link/button hover borders
      focus: '#646cff', // Focus indicators
      disabled: '#666', // Disabled backgrounds
      disabledText: '#999', // Disabled text
    },

    // Special use cases
    currentTurn: {
      background: '#1a3d1a', // Green tint for current turn row
      border: '#4CAF50', // Green border for current turn
    },
  },

  // Typography scale
  typography: {
    sizes: {
      xs: '0.7rem',    // Creature IDs
      sm: '0.8rem',    // Small buttons, JSON content
      base: '0.9rem',  // Body text, list items
      lg: '1rem',      // Default size
      xl: '3.2em',     // Main headings
    },

    weights: {
      normal: 400,
      medium: 500,
      bold: 'bold',
    },

    families: {
      sans: 'system-ui, -apple-system, sans-serif',
      mono: 'monospace',
      system: 'system-ui, Avenir, Helvetica, Arial, sans-serif',
    },
  },

  // Spacing scale (consistent padding/margins)
  spacing: {
    xs: '0.25rem',
    sm: '0.5rem',
    md: '1rem',
    lg: '1.5rem',
    xl: '2rem',
  },

  // Border radius
  radii: {
    sm: '3px',
    base: '4px',
    lg: '8px',
  },

  // Breakpoints for responsive design
  breakpoints: {
    mobile: '1000px',
  },
} as const;

// Type for the theme (enables autocomplete)
export type Theme = typeof theme;

// Helper function to access theme in template literals
export const th = (path: string) => (props: { theme: Theme }) => {
  const keys = path.split('.');
  let value: any = props.theme;

  for (const key of keys) {
    value = value?.[key];
  }

  return value;
};