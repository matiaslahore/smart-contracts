To install:
npm install -g truffle
npm install

To build site:  
 gulp buildsite

In Production:  

 npm install --production

 NODE_ENV=production node server.js
 
 
 **************************** Deploy ****************************
 
 La instalacion se puede dividir en tres partes:

 1) Instalacion de la API en node.js (requiere node.js ~8.4.0)
 
     1.1) Clonar el proyecto
     
     1.2) Seguir las instrucciones de instalacion mencionadas arriba
     
     1.3) Para correr la aplicacion: 'node app.js' o 'nodemon app.js'
     
     1.4) En app.js se encuentran las difrentes rutas y servicios.
 
 2) Instalacion de la base de datos
 
     2.1) Instalar un ambiente de mysql
     
     2.2) Crear una base de datos con el nombre 'api_ether' (se puede cambiar desde config)
     
     2.3) Correr scrpit 'dbo.users'
 
 3) Instalar testrpc para crear un ambiente para el blockchain
 
     3.1) Instalar testrpc desde: https://github.com/trufflesuite/ganache-cli
     
     3.2) Seguir los pasos de instalacion de la pagina.
     
     3.3) Se va a necesitar una cuenta central. Que en este caso seria la aseguradora
         Para eso se va a iniciar testrpc dos veces. De la primera sacamos la cuenta central y 
         la pegamos en la segunda, es decir:
         ' testrpc --debug --account="0xaa73b5c98e60d589e71ce7cff59c02f82e12c7ce676ee356da8e058a285ccd61,1000000000000000000000" '
         Eso nos va a devolver una cuenta, por ej: '0x22ddfe3c6439839edf8e2e56126c65c5fc5a2f40'
         Y a esa cuenta la pegamos en la segunda instancia:
         ' testrpc --debug --account="0xaa73b5c98e60d589e71ce7cff59c02f82e12c7ce676ee356da8e058a285ccd61,1000000000000000000000" --unlock "0x22ddfe3c6439839edf8e2e56126c65c5fc5a2f40" '
         De esta forma creamos una cuenta central, que esta desbloqueda y con varios Eth. 
     
 
 Ejemplos:
  
 1) Registracion:
 
     URL = http://localhost:3000/register
     TYPE = POST
     BODY = 
     {
       "apiKey": "test",
       "email": "matiaslahore@gmail.com",
       "password": "12345678"
     }
  
 2) Obtener Balance:
 
     URL = http://localhost:3000/balance/matiaslahore@gmail.com
     TYPE = GET
 
 3) Cargar Saldo a la cuenta:
 
     URL = http://localhost:3000/sendTestnetEthers/:account
     //account es la cuenta central. En el ejemplo: '0x22ddfe3c6439839edf8e2e56126c65c5fc5a2f40'
     TYPE = POST
     BODY = 
     {
       "apiKey": "test",
       "email": "matiaslahore@gmail.com",
       "password": "12345678"
     }
  
 4) Asegurar:
 
     URL = http://localhost:3000/insure
     TYPE = POST
     BODY = 
     {
       "apiKey": "test",
       "email": "matiaslahore@gmail.com",
       "itemId": "1",
       "deviceBrand": "apple",
       "deviceYear": "2015",
       "wearLevel": "60",
       "password": "12345678",
       "region": "usa"
     }
 
 
