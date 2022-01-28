const Grupos = require('../models/Grupos');
const Meeti = require('../models/Meeti');
const { body } = require('express-validator');
const uuid = require('uuid').v4;

//Formulario para nuevos Meeti
exports.formNuevoMeeti = async (req, res) => {
    const grupos = await Grupos.findAll({ where: { usuarioId: req.user.id }});

    res.render('nuevo-meeti', {
        nombrePagina: 'Crear Nuevo Meeti',
        grupos
    })
}

//Inserta nuevos meeti en la BD
exports.crearMeeti = async (req, res) => {
    //OBtener los datos
    const meeti = req.body;

    //Asginar el id
    meeti.id = uuid();

    //Asignar el usuario
    meeti.usuarioId = req.user.id;
    
    //Almacena la ubicación con un point 
    const point = {type: 'Point', coordinates: [parseFloat(req.body.lat), parseFloat(req.body.lng) ]};
    meeti.ubicacion = point;

    //Cupo opcional
    if(req.body.cupo === ''){
        meeti.cupo = 0;
    }

    //Almacenar en la BD
    try {
        await Meeti.create(meeti);
        req.flash('exito', 'Se ha creado el Meeti correctamente');
        res.redirect('/administracion');
    } catch (error) {
        //Extraer el msg de los errores de Sequelize
        const erroresSequelize = error.errors.map(err => err.message);
        req.flash('error', erroresSequelize);
        res.redirect('/nuevo-meeti');
    }
}

//Sanitiza los meeti
exports.sanitizarMeeti = (req, res, next) => {
    body('titulo').trim().escape();
    body('invitado').trim().escape();
    body('cupo').trim().escape();
    body('fecha').trim().escape();
    body('hora').trim().escape();
    body('direccion').trim().escape();
    body('ciudad').trim().escape();
    body('estado').trim().escape();
    body('pais').trim().escape();
    body('lat').trim().escape();
    body('lng').trim().escape();
    body('grupoId').trim().escape();

    next();
} 

//Muestra el formulario para editar un meeti
exports.formEditarMeeti = async (req, res) => {
    const consultas = [];
    consultas.push(Grupos.findAll({where: {usuarioId: req.user.id}}));
    consultas.push(Meeti.findByPk(req.params.id));

    //Return un promise
    const [grupos, meeti] = await Promise.all(consultas);

    if(!grupos || !meeti){
        req.flash('error', 'Operación no válida');
        res.redirect('/administracion');
        return next();
    }

    res.render('editar-meeti', {
        nombrePagina: `Editar Meeti: ${meeti.titulo}`,
        grupos,
        meeti
    })

}

//Almacena los cambios en el meeti (BD)
exports.editarMeeti = async (req, res) => {
    const meeti = await Meeti.findOne({where: {id: req.params.id, usuarioId: req.user.id}});

    if(!meeti){
        req.flash('error', 'Operación no válida');
        res.redirect('/administracion');
        return next();
    }

    //Asignar los valores
    const {grupoId, titulo, invitado, fecha, hora, cupo, descripcion, direccion, ciudad, estado, pais, lat, lng} = req.body;
    
    meeti.grupoId = grupoId;
    meeti.titulo = titulo;
    meeti.invitado = invitado;
    meeti.fecha = fecha;
    meeti.hora = hora;
    meeti.cupo = cupo;
    meeti.descripcion = descripcion;
    meeti.direccion = direccion;
    meeti.ciudad = ciudad;
    meeti.estado = estado;
    meeti.pais = pais;

    //Asignar el point (ubicacion)
    const point = {type: 'Point', coordinates: [parseFloat(lat), parseFloat(lng)]};
    meeti.ubicacion = point;

    //Almacenar en la BD
    await meeti.save();
    req.flash('exito', 'Cambios guardados correctamente');
    res.redirect('/administracion');


}

//Formulario para eliminar meeti
exports.formEliminarMeeti = async (req, res) => {
    const meeti = await Meeti.findOne({
        where: {
            id: req.params.id,
            usuarioId: req.user.id
        }
    })

    if(!meeti){
        req.flash('error', 'Operación no válida');
        res.redirect('/administracion');
        return next();
    }

    //Todo bien
    res.render('eliminar-meeti', {
        nombrePagina: `Eliminar Meeti: ${meeti.titulo}`
    })
}

//Eliminar Meeti
exports.eliminarMeeti = async (req, res) => {

    //Si hay un meeti
    //Eliminar el meeti
    await Meeti.destroy({
        where: {
            id: req.params.id
        }
    })

    //Redireccionar
    req.flash('exito', 'Meeti Eliminado');
    res.redirect('/administracion');

}