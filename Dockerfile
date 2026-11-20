# Mi Granjita: Apache + PHP 8.3 con el juego dentro.
FROM php:8.3-apache

# Extensión para que PHP hable con MySQL.
RUN docker-php-ext-install pdo_mysql \
 && sed -i '/<Directory \/var\/www\/>/,/<\/Directory>/ s/AllowOverride None/AllowOverride All/' /etc/apache2/apache2.conf

COPY . /var/www/html/
# La contraseña llega por variables de entorno (docker-compose.yml), no por config.local.php.
RUN rm -f /var/www/html/api/config.local.php && chown -R www-data:www-data /var/www/html
