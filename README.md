# oswap token backend

## Installation
Install node.js 14+, clone the repository, then

`npm install`

By default the API is accessible at `http://localhost:3005`. You may want to setup a reverse proxy like Nginx to make it accessible on a public url.


## ENV
Copy the appropriate .env.XXXX file to .env and changing it

## Run
`npm run start`

## Nginx
```text
server {
	listen 80;
	server_name localhost;

	location / {
		proxy_http_version 1.1;
		proxy_set_header Upgrade $http_upgrade;
		proxy_set_header Connection "upgrade";
		proxy_pass http://127.0.0.1:3005;
	}

	location ~ \.(js|ico|svg|css|png|jpeg|json) {
		root /path/to/build;
	}
}