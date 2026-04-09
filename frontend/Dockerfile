# Dockerfile pour le Frontend React
# Build stage
FROM node:18-alpine AS build

WORKDIR /app

# Arguments de build
ARG REACT_APP_BACKEND_URL
ENV REACT_APP_BACKEND_URL=$REACT_APP_BACKEND_URL

# Copier package.json et installer les dépendances
COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile

# Copier le code source et construire
COPY . .
RUN yarn build

# Production stage avec Nginx
FROM nginx:alpine

# Copier les fichiers de build
COPY --from=build /app/build /usr/share/nginx/html

# Copier la configuration Nginx personnalisée
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Exposer les ports
EXPOSE 80 443

CMD ["nginx", "-g", "daemon off;"]
