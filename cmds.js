const {models} = require('./model');
const {log,biglog,errlog,colorize} = require("./out");
const Sequelize = require ('sequelize');

exports.helpCmd=(socket, rl)=>{
    log(socket,"Commandos");
    log(socket,"list - Listar los quizzes existentes.");
    log(socket,"show <id> - Muestra la pregunta y la respuesta del quizz indicado.");
    log(socket,"add - Añadir un nuevo quizz");
    log(socket,"delete <id> - Borrar el quiz indicado ");
    log(socket,"edit <id> - Editar el quiz indicado");
    log(socket,"test <id> - Probar el quiz indicado");
    log(socket,"p|play - Jugar a preguntar aleatoriamente todos los quizzes");
    log(socket,"credits - Creditos");
    log(socket,"q|quit -Salir del programa");
    rl.prompt();
};
const makeQuestion = (rl,text)=>{
  return new Sequelize.Promise((resolve,reject)=>{
      rl.question(colorize(text,'red'),answer=>{
          resolve(answer.trim());
      });
  });
};


exports.addCmd=(socket,rl)=>{
    makeQuestion(rl,'Introduzca una pregunta:')
        .then(q =>{
            return makeQuestion (rl,'Introduzca una respuesta:')
            .then (a => {
                return{question:q,answer:a};
            });
        })
        .then(quiz => {return models.quiz.create(quiz)})
        .then ((quiz) =>{log(socket,`${colorize('Se ha añadido','magenta')}:${quiz.question},${colorize('=>','magenta')},${quiz.answer}`)})
        .catch(Sequelize.ValidationError, error=>{
            errlog(socket,'El quiz es erroneo');
            error.errors.forEach(({message})=>errlog(socket,message));
        })
        .catch(error=>{errlog(socket,error.message);})
        .then(()=>{rl.prompt();});
};


exports.listCmd=(socket,rl)=> {
    models.quiz.findAll()
        .each(quiz => {
            log(socket,`[${colorize(quiz.id, 'magenta')}]: ${quiz.question}`);
        })
        .catch(error => {
            errlog(socket,error.message);
        })
        .then(() => {
            rl.prompt();
        });
};

const validateId = Id => {
  return new Sequelize.Promise((resolve,reject)=>{
      if (typeof Id === "undefined"){
          reject(new Error (`Falta el parametro <id>.`));
      } else {
          id = parseInt(Id);
          if (Number.isNaN(id)){
              reject (new Error (`El valor del parametro <Id> no es un numero.`));}
              else{
                  resolve (id);
              }
          }
      });
};




exports.showCmd=(socket,rl,id)=>{
    validateId(id)
        .then(id => models.quiz.findById(id))
        .then(quiz =>{
            if(!quiz){
                throw new Error(`No existe un quiz asociado al id = ${id}.`)
            }
            log(socket,`[${colorize(quiz.id, 'magenta')}]: ${quiz.question} ${colorize('=>','magenta')} ${quiz.answer}`);
        })
        .catch(error=>{
            errlog(socket,error.message)
        })
        .then(()=> {rl.prompt()});
};


exports.deleteCmd=(socket,rl,id)=>{
    validateId(id)
    .then(id => models.quiz.destroy({where:{id}}))
        .catch(error =>{errlog(error.message)} )
        .then(()=> {rl.prompt();});
};


exports.editCmd=(socket,rl,id)=>{
validateId(id)
    .then(id => models.quiz.findById(id))
    .then(quiz=> {
        if (!quiz) {
            throw new Error(`No hay quiz asociado a este Id: ${id}.`)
        }
        process.stdout.isTTY && setTimeout(() => {rl.write(quiz.question)}, 0);
        return makeQuestion(rl,'Introduzca una pregunta')
            .then (q=>{
                process.stdout.isTTY && setTimeout(() => {rl.write(quiz.answer)}, 0);
                return makeQuestion(rl,'Introduzca una respuesta')
                    .then (a=>{
                        quiz.question=q;
                        quiz.answer=a;
                        return quiz;
                    })
            })

    })
    .then(quiz=> {return quiz.save()})
    .then(quiz=>{socket,log(`Se ha cambiado el quiz ${colorize(quiz.id,'magenta')} por: ${colorize(quiz.question)} ${colorize('=>','magenta')} ${colorize(quiz.answer)} `)})
    .catch(Sequelize.ValidationError, error =>{errlog(socket,'El quiz es erroneo:'); error.errors.forEach(({message})=> errlog(socket,message));})
    .then (() => {rl.prompt();});

};


exports.testCmd=(socket,rl,id)=>{
 validateId(id)
     .then(id => {return models.quiz.findById(id)})
     .then(quiz=>{
         return makeQuestion(rl,quiz.question)
             .then (a => {
                 if (a.toLowerCase().trim() === quiz.answer.toLowerCase().trim()) {
                     log(socket,'Su respuesta es correcta.');
                     biglog(socket,'Correcta', 'green');
                     rl.prompt();
                 } else {
                     log(socket,'Su respuesta es incorrecta.');
                     biglog(socket,'Incorrecta', 'red');
                     rl.prompt();}
             })
     })
     .catch(Sequelize.ValidationError, error =>{errlog(socket,'El quiz es erroneo:'); error.errors.forEach(({message})=> errlog(socket,message));})
     .catch(error=>{errlog(socket,error.message)})
     .then(()=>{rl.prompt()})


    /**  if (typeof id === "undefined"){
        errlog('el id no existe');
        rl.prompt();
    } try{
        const quiz = model.getById(id);
        rl.question(quiz.question,resp=>{
            if (resp.toLowerCase().trim() === quiz.answer.toLowerCase().trim()){
                log (`La respuesta es ${colorize('correcta','green')}`);
                rl.prompt();
            }
            else {log (`Has ${colorize('fallado','red')}`);rl.prompt();}
        });
    } catch (error){errlog(error.message);}
*/
   };


exports.playCmd=(socket,rl)=>{
    let score = 0;
    let toBeResolved=[];
    models.quiz.findAll()
        .each(quiz=>{
            toBeResolved.push(quiz)
        })
        .then(()=>playOne())
    const playOne =()=>{
        if (toBeResolved.length === 0) {
            log(socket,`Fin del juego.Numero de Aciertos: ${score}`)
        } else {
            const min = 0;
            const max = toBeResolved.length;
            let id_l = Math.floor(Math.random() * (max - min)) + min;
            let quiz = toBeResolved[id_l];
            return makeQuestion(rl, quiz.question)
                .then(a => {
                    if (a.toLowerCase().trim() === quiz.answer.toLowerCase().trim()) {
                        score++;
                        log(socket,`CORRECTO - Lleva ${score} aciertos.`);


                        toBeResolved.splice(id_l, 1);
                        playOne();

                    } else {
                        log(socket,`INCORRECTO -Fin del juego.Numero de Aciertos: ${score}`)
                        rl.prompt();
                    }
                })

                .catch(Sequelize.ValidationError, error => {
                    errlog(socket,'El quiz es erroneo:');
                    error.errors.forEach(({message}) => errlog(socket,message));
                })
                .catch(error => {
                    errlog(socket,error.message)
                })
                .then(() => {
                    rl.prompt()
                })
        }

    }


    /**const playOne =()=> {
        if (toBeResolved.length = 0) {
            log(`No hay mas preguntas, tu puntuacion es de ${colorize(score, "green")}`);
        } else {
            const min = 0;
            const max = toBeResolved.length;
            let id_l = Math.floor(Math.random() * (max - min)) + min;
            let id_g= toBeResolved[id_l];
            let quiz = model.getById(id);
            rl.question(quiz.question, resp => {
                if (resp.toLowerCase().trim() === quiz.answer.toLowerCase().trim()) {
                    log(`La respuesta es ${colorize('correcta', 'green')}`);
                    score++;
                    toBeResolved.splice(id,1);
                    playOne();
                }
                else {log (`Has ${colorize('fallado','red')} tu puntuació ha sido ${colorize(score,'blue')}`);
                rl.prompt();}
            })
        }

    }
    playOne();
     */
};


exports.creditsCmd=(socket,rl)=>{log(socket,"Autor de la práctica");
    log(socket,"Daniel Vagace");
    rl.prompt();};

exports.quitCmd = (socket, rl) => {
    rl.close();
    socket.end();
};