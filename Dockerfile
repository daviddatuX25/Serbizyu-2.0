FROM composer:2.8 AS vendor
WORKDIR /app
COPY composer.json composer.lock ./
RUN composer install --no-dev --no-interaction --no-progress --prefer-dist --no-scripts
COPY . .
RUN composer dump-autoload --no-dev --classmap-authoritative --no-interaction \
    && php artisan package:discover --ansi

FROM node:22-bookworm-slim AS assets
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY resources ./resources
COPY public ./public
COPY tsconfig.json vite.config.ts artisan ./
RUN npm run typecheck && npm run build

FROM php:8.4-fpm-bookworm AS app
WORKDIR /var/www/html
RUN mv "$PHP_INI_DIR/php.ini-production" "$PHP_INI_DIR/php.ini" \
    && apt-get update \
    && apt-get install -y --no-install-recommends libicu-dev libpq-dev libzip-dev unzip \
    && docker-php-ext-install -j"$(nproc)" bcmath intl opcache pdo_pgsql \
    && pecl install redis \
    && docker-php-ext-enable redis \
    && rm -rf /var/lib/apt/lists/*
COPY --from=vendor /app /var/www/html
COPY --from=assets /app/public/build /var/www/html/public/build
RUN mkdir -p storage/framework/cache storage/framework/sessions storage/framework/views storage/logs bootstrap/cache \
    && chmod -R a+rX /var/www/html \
    && chown -R www-data:www-data storage bootstrap/cache
USER www-data
EXPOSE 9000
CMD ["php-fpm", "-F"]

FROM nginx:1.29-alpine AS web
COPY docker/nginx/default.conf /etc/nginx/conf.d/default.conf
COPY --from=app /var/www/html/public /var/www/html/public
EXPOSE 80
