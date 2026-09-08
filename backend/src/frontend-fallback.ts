type FrontendRequest = {
  method?: string;
  path?: string;
  headers?: Record<string, string | string[] | undefined>;
};

export function shouldServeFrontend(req: FrontendRequest): boolean {
  if (req.method !== 'GET') return false;

  const accept = String(req.headers?.accept || '');
  const acceptsHtml = accept.includes('text/html');
  const hasNoSpecificPreference = accept === '' || accept === '*/*';
  return acceptsHtml || (req.path === '/' && hasNoSpecificPreference);
}
