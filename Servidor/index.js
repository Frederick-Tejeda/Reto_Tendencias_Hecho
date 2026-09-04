import app from './app.js'
import './db.js'

const server = () => app.listen(app.get('PORT'), () => console.log(`Servidor corriendo en el puerto ${app.get('PORT')}`))

server()