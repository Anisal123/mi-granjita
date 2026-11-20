# Publicar Mi Granjita en internet

Hay dos formas. Elige según lo que necesites:

| | Vercel | VPS (con o sin Docker) |
|---|---|---|
| Costo | Gratis | Lo que ya pagas por tu VPS |
| Dificultad | Muy fácil (5 minutos) | Docker: fácil (10 minutos) · a mano: media (20–30 minutos) |
| Historia, música, granja | Sí | Sí |
| Guardado | En el navegador de cada jugador | En MySQL (y copia en el navegador) |
| Multijugador (pueblo, ranking, regalos) | No | Sí |

> **¿Por qué Vercel no tiene multijugador?** Vercel sirve páginas, pero no ejecuta PHP ni tiene MySQL.
> El juego lo detecta solo y pasa a modo de un jugador, sin mostrar errores.
> Render tampoco ofrece MySQL, así que para el multijugador lo más simple es tu VPS.

---

## Opción A · Vercel (un jugador, gratis)

No hay que cambiar nada del código. El archivo `.vercelignore` ya evita subir la carpeta `api/` (PHP) y `database/`.

### Con la página de Vercel (sin terminal)

1. Sube el proyecto a un repositorio de GitHub (por ejemplo con GitHub Desktop o desde VS Code).
2. Entra a <https://vercel.com>, inicia sesión con GitHub y pulsa **Add New → Project**.
3. Elige tu repositorio y pulsa **Import**.
4. En **Framework Preset** deja **Other**. No escribas ningún comando de build. Pulsa **Deploy**.
5. Al terminar te da un enlace como `https://mi-granjita.vercel.app`. ¡Ese es el que compartes!

Cada vez que subas cambios a GitHub, Vercel actualiza el juego solo.

### Con la terminal de VS Code

```powershell
npm install -g vercel
vercel login
vercel --prod
```

Ejecuta los comandos dentro de la carpeta del juego. Cuando pregunte, acepta los valores que propone (Enter).

---

## Opción B · Tu VPS con Docker (recomendado, multijugador completo)

El proyecto ya trae `Dockerfile`, `docker-compose.yml` y `.env.example`. Docker levanta dos contenedores:
**web** (Apache + PHP con el juego) y **db** (MySQL, que crea la base sola la primera vez).
No hace falta instalar Apache, PHP ni MySQL en el VPS, ni crear `config.local.php`.

### 1. Instalar Docker en el VPS (una sola vez)

```bash
ssh usuario@IP-DE-TU-VPS
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker $USER
exit
```

Vuelve a entrar con `ssh` para que el permiso se active.

### 2. Subir el juego

Desde tu computadora (PowerShell, en la carpeta donde está el zip):

```powershell
scp mi-granjita2-kawaii.zip usuario@IP-DE-TU-VPS:~
```

En el VPS:

```bash
sudo apt install -y unzip
unzip ~/mi-granjita2-kawaii.zip -d ~
cd ~/mi-granjita2
```

### 3. Poner tus contraseñas

```bash
cp .env.example .env
nano .env
```

Cambia las dos contraseñas (inventa las que quieras) y guarda con **Ctrl+O, Enter, Ctrl+X**.
Si el puerto 80 ya lo usa otra cosa en tu VPS, cambia `PUERTO=80` por `PUERTO=8080`.

### 4. Encender el juego

```bash
docker compose up -d --build
```

La primera vez tarda uno o dos minutos. Luego abre `http://IP-DE-TU-VPS/`
(o `http://IP-DE-TU-VPS:8080/` si cambiaste el puerto). Si en la bienvenida aparece **Código del pueblo**, el multijugador funciona.

Si el VPS tiene firewall: `sudo ufw allow 80` (o `8080`).

### Comandos útiles

```bash
docker compose ps              # ver si web y db están encendidos
docker compose logs -f web     # ver errores del juego (Ctrl+C para salir)
docker compose down            # apagar (las granjas se conservan)
```

### Actualizar el juego más adelante

Sube el zip nuevo y, en el VPS:

```bash
unzip -o ~/mi-granjita2-kawaii.zip -d ~
cd ~/mi-granjita2
docker compose up -d --build
```

Tu archivo `.env` y las granjas guardadas se conservan.

### Dominio con HTTPS (opcional)

Apunta tu dominio a la IP del VPS (registro **A**). La forma más simple de agregar HTTPS es poner
[Caddy](https://caddyserver.com) delante: cambia `PUERTO=8080` en `.env`, instala Caddy en el VPS y en
`/etc/caddy/Caddyfile` escribe solo `tudominio.com { reverse_proxy localhost:8080 }`. Luego `sudo systemctl reload caddy`.
Caddy saca y renueva el certificado solo.

---

## Opción C · Tu VPS sin Docker (instalando todo a mano)

Estos pasos son para un VPS con **Ubuntu 22.04 o 24.04**. El juego necesita **PHP 8.1 o más nuevo**.

### 1. Instalar Apache, PHP y MySQL

Conéctate al VPS (`ssh usuario@IP-DE-TU-VPS`) y ejecuta:

```bash
sudo apt update
sudo apt install -y apache2 php libapache2-mod-php php-mysql mysql-server unzip
php -v        # debe decir 8.1 o más
```

### 2. Subir el juego

Desde tu computadora (PowerShell, en la carpeta donde está el zip):

```powershell
scp mi-granjita2-kawaii.zip usuario@IP-DE-TU-VPS:~
```

En el VPS:

```bash
unzip ~/mi-granjita2-kawaii.zip -d ~
sudo rm -f /var/www/html/index.html
sudo cp -r ~/mi-granjita2/. /var/www/html/
```

### 3. Crear la base de datos y un usuario solo para el juego

Cambia `UnaClaveSegura123` por una contraseña tuya:

```bash
sudo mysql < /var/www/html/database/mi_granjita.sql
sudo mysql -e "CREATE USER 'granjita'@'localhost' IDENTIFIED BY 'UnaClaveSegura123';"
sudo mysql -e "GRANT ALL PRIVILEGES ON mi_granjita.* TO 'granjita'@'localhost'; FLUSH PRIVILEGES;"
```

### 4. Decirle al juego cuál es esa contraseña

```bash
sudo cp /var/www/html/api/config.local.example.php /var/www/html/api/config.local.php
sudo nano /var/www/html/api/config.local.php
```

Deja el archivo así (con tu contraseña) y guarda con **Ctrl+O, Enter, Ctrl+X**:

```php
<?php
return [
    'host' => '127.0.0.1',
    'port' => '3306',
    'database' => 'mi_granjita',
    'username' => 'granjita',
    'password' => 'UnaClaveSegura123',
];
```

### 5. Permitir protecciones de carpeta y abrir el firewall

```bash
sudo sed -i '/<Directory \/var\/www\/>/,/<\/Directory>/ s/AllowOverride None/AllowOverride All/' /etc/apache2/apache2.conf
sudo systemctl restart apache2
sudo ufw allow 'Apache Full'
```

Ya puedes abrir `http://IP-DE-TU-VPS/` en el navegador. En la bienvenida aparecerá el campo **Código del pueblo**: eso indica que el multijugador está activo.

### 6. (Opcional) Dominio con HTTPS

Si tienes un dominio, apúntalo a la IP del VPS (registro **A** en tu proveedor de dominio) y luego:

```bash
sudo apt install -y certbot python3-certbot-apache
sudo certbot --apache -d tudominio.com
```

### Actualizar el juego más adelante

Sube el zip nuevo, descomprímelo y copia los archivos encima **sin borrar** `api/config.local.php`:

```bash
unzip -o ~/mi-granjita2-kawaii.zip -d ~
sudo cp -r ~/mi-granjita2/. /var/www/html/
```

---

## Si algo no funciona

- **La página muestra el código PHP en vez de funcionar:** falta `libapache2-mod-php`. Instálalo y reinicia Apache.
- **No aparece el campo «Código del pueblo» en el VPS:** el juego no pudo hablar con MySQL. Revisa la contraseña en `api/config.local.php` y prueba abrir `http://IP-DE-TU-VPS/api/partidas.php`: debe mostrar un texto que empieza con `{"ok":true`.
- **Se ve la versión vieja:** pulsa **Ctrl + F5** en el navegador.
