// Keep search metadata on the public domain across production and preview builds.
export const siteUrl = (path = '/') => new URL(path, 'https://opensync.ca').href;
