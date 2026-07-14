FROM node:22-alpine AS build

WORKDIR /app
COPY package*.json ./
# See Dockerfile.dev: `npm install -g npm@latest` pulls npm 12, which requires
# Node >=22.22 and fails on the base image. The bundled npm is sufficient.
RUN npm install
COPY . .
RUN npm run build


FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]