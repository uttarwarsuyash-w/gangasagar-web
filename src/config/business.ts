// Verified facts only (from the owners' plan). Everything else lives in site_settings.
export const BUSINESS = {
  name: 'Gangasagar',
  established: 2005,
  hours: { open: '08:00', close: '20:00' },
  phones: {
    main: '9403951524',
    support: '9372188080',
    gangadharJi: '9272103080',
  },
  whatsapp: {
    main: '9403951524',
    support: '9372188080',
  },
  city: 'Nanded',
} as const;

/** Map search for the shop until the owners add the exact maps_url in settings. */
export const DIRECTIONS_URL = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
  `${BUSINESS.name} ${BUSINESS.city}`,
)}`;
