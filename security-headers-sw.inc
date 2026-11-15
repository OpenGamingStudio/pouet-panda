# En-têtes de la réponse de /sw.js : la CSP s'applique au worker lui-même (voir nginx.conf).
# Seul écart avec security-headers.inc : connect-src 'self' (le worker doit pouvoir lire les fichiers du jeu pour les garder en cache).
add_header Content-Security-Policy "default-src 'none'; connect-src 'self'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'" always;
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
add_header X-Content-Type-Options "nosniff" always;
add_header X-Frame-Options "DENY" always;
add_header Referrer-Policy "no-referrer" always;
add_header Permissions-Policy "accelerometer=(), camera=(), geolocation=(), gyroscope=(), microphone=(), payment=(), usb=()" always;
add_header Cross-Origin-Opener-Policy "same-origin" always;
