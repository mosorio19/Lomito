const mongoose = require("mongoose");
const Schema = mongoose.Schema;


const petSchema = new Schema({
  nombre: String,
  edad: Number,
  caracteristicas: String,
  descripcion: String,
  raza: {
    type: String,
    enum: ['golden', 'chihuahua', 'labrador', 'extragrande ']
  },
  talla: {
    type: String,
    enum: ['chico', 'mediano', 'grande', 'extragrande ']
  },
  image: String,
  direccionAdopcion: String,
  horasInicio: String,
  horasFin: String,
  requerimientos:String,
  status: Number,//debe ser numero 1,2,3 [1 => adoptado, 2 en proceso, 3 => no adoptado]
  user_id: { type: Schema.ObjectId, ref: 'Usuario' },
},{
    timestamps: {
      createdAt: "created_at",
      updatedAt: "updated_at"
    }
  })
const Pet = mongoose.model('Pet', petSchema)
module.exports = Pet;