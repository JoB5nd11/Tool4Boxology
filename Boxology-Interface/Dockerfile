FROM node:18-alpine AS build

WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80
# Run development server with host option for Docker
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]