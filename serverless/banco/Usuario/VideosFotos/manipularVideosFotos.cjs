const { Pool } = require('pg');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
//'utf8', 'latin1', 'ascii', 'base64'
const pool = new Pool({
  user: 'aws',
  database: 'Aws_DB',
  password: 'root',
  port: 5432,
  max: 500,
  idleTimeoutMillis: 10000,
  connectionTimeoutMillis: 2000,
});

async function verificaTokenBearer(usuario, Token) {
  const decode = jwt.decode(Token);
  const idDecode = decode.id;
  if (usuario.id !== idDecode) {
    throw new Error(`Usuario: ${usuario.nome} nao e dono desse token`);
  } else {
    return usuario;
  }
}
module.exports.EnviaVideoOuFoto = async (valores) => {
  const body = valores.body;
  const { id } = valores.pathParameters;
  const client = await pool.connect();
  const result = await client.query('SELECT * FROM "Usuario" WHERE id = $1', [
    id,
  ]);
  const usuario = result.rows[0];
  if (!usuario) {
    throw new Error(`Usuario do id: ${id} nao existente`);
  }
  const valorHeader = valores.headers.authorization;
  if (valorHeader === undefined) {
    throw new Error('Token precisa ser inserido');
  }
  const Token = valorHeader.split(' ')[1];
  const chaveBearer = valorHeader.split(' ')[0];
  if (chaveBearer !== 'Bearer') {
    throw new Error('Token precisa ser Bearer');
  }
  await verificaTokenBearer(usuario, Token);
  const buffer = Buffer.from(body, 'base64');
  const dado = buffer.toString('utf8');
  const dadoS = dado.split(' + ');
  const dadosLink = dadoS[0].split(' + ');
  const regex = /https:\/\/drive\.google\.com\/[^\s]+/;
  const verificaGoogleDrive = regex.test(dadosLink);
  if (verificaGoogleDrive === false) {
    throw new Error('Link deve ser do google drive');
  }
  const match = dadosLink[0].match(regex);
  const link = match[0];
  const separadaLink = link.split('/');
  const maybeFile = separadaLink[3];
  if (maybeFile !== 'file') {
    if (maybeFile === 'folders') {
      throw new Error('link enviado e uma pasta e nao um arquivo');
    } else if (maybeFile === 'document') {
      throw new Error('link enviado e um documento e nao um arquivo');
    } else if (maybeFile === 'spreadsheets') {
      throw new Error('link enviado e uma planilha e nao um arquivo');
    } else if (maybeFile === 'presentation') {
      throw new Error('link enviado e uma apresentacao e nao um arquivo');
    } else if (maybeFile === 'forms') {
      throw new Error('link enviado e um formulario e nao um arquivo');
    } else {
      throw new Error('Link inesperado');
    }
  }
  const uuidB = crypto.randomBytes(16);
  const key = 'JyYuFhSSdewBLM2Vna0G6bfiRFepekQ9';
  const transcript = crypto.createCipheriv('aes-256-cbc', key, uuidB);
  let linkCriptografado = transcript.update(link, 'utf8', 'hex');
  const linkParaArray = (linkCriptografado += transcript.final('hex'));
  usuario.videofoto.push(linkParaArray);
  client.query('UPDATE "Usuario" SET "videofoto" = $1 WHERE id = $2', [
    usuario.videofoto,
    id,
  ]);
  client.release();
  return [`Usuario: ${usuario.nome} enviou um arquivo`, link];
};
