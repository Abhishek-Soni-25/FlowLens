import { useState } from 'react';
import { Globe2 } from 'lucide-react';

export function ProjectIcon({
  faviconUrl,
  className = '',
}: {
  faviconUrl?: string;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  const showFavicon = Boolean(faviconUrl && !failed);

  return (
    <span className={`project-site-icon ${className}`} aria-hidden="true">
      {showFavicon ? (
        <img src={faviconUrl} alt="" onError={() => setFailed(true)} />
      ) : (
        <Globe2 />
      )}
    </span>
  );
}
