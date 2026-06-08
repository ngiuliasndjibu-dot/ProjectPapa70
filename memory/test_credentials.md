# Test Credentials — Lumière POS

These accounts are created by the `/api/seed` endpoint (also via "Initialiser la base de données" on the login page).

| Rôle | Username | Password |
|------|----------|----------|
| Administrateur | `admin` | `admin123` |
| Serveur | `serveur1` | `123456` |
| Barman | `barman1` | `123456` |
| Cuisine | `cuisine1` | `123456` |
| Caissier | `caisse1` | `123456` |

Login API: `POST /api/auth/login` with body `{"username": "...", "password": "..."}`
Returns `{ token, user }`. Token is a JWT used as `Authorization: Bearer <token>`.
