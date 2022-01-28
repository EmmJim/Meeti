const Grupos = require('../../models/Grupos');
const Meeti = require('../../models/Meeti');
const moment = require('moment');

exports.mostrarGrupo = async(req, res, next) => {
    const consultas = [];

    consultas.push(Grupos.findOne({ where: {id: req.params.id} }));
    consultas.push(Meeti.findAll({ where: {grupoId: req.params.id}, 
        order: [
            ['fecha', 'ASC']
        ]
    }));

    const [grupo, meetis] = await Promise.all(consultas);

    //Si no hay grupo
    if(!grupo) {
        res.redirect('/');
        return next();
    }

    //Vista
    res.render('mostrar-grupo', {
        nombrePagina: `Información Grupo: ${grupo.nombre}`,
        grupo, 
        meetis, 
        moment
    })
}