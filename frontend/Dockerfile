FROM node:20-alpine AS build
ARG VITE_BUILD_ID=dev
ENV VITE_BUILD_ID=$VITE_BUILD_ID
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install --no-fund --no-audit
COPY . .
RUN npm run build

FROM nginx:alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80