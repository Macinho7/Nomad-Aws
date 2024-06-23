const { randomUUID } = require('crypto');
const { Pool } = require('pg');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');
const {
  verificaCampoProibido,
} = require('../Usuario/verificaPalavras.js/manipulaPalavrasDoCampo');
dotenv.config({ path: '../../.env' });
const pool = new Pool({
  user: 'aws',
  database: 'Aws_DB',
  password: 'root',
  port: 5432,
  max: 500,
  idleTimeoutMillis: 10000,
  connectionTimeoutMillis: 2000,
});
async function verificaEspacoNome(valor) {
  await verificaCampoProibido(valor);
  const tamanho = valor.length;
  if (tamanho > 25) {
    throw new Error(`Nome: ${valor} muito grande, max 25 caracteres`);
  } else if (tamanho < 5) {
    throw new Error(`Nome: ${valor} muito pequeno, min 5 caracteres`);
  }
  const verificacao = valor.includes(' ');
  if (verificacao === true) {
    throw new Error('Campo nome possui espaco');
  } else {
    return valor;
  }
}
async function verificaEspacoEmail(valor) {
  const verificacao = valor.includes(' ');
  if (verificacao === true) {
    throw new Error('Campo email possui espaco');
  } else {
    return valor;
  }
}
async function verificaEspacoSenha(valor) {
  const tamanho = valor.length;
  if (tamanho > 40) {
    throw new Error(`senha: ${valor} acima do limite de caracteres`);
  }
  const verificacao = valor.includes(' ');
  if (verificacao === true) {
    throw new Error('Campo senha possui espaco');
  } else {
    return valor;
  }
}
async function verificaEspacoPaís(valor) {
  await verificaCampoProibido(valor);
  const verificacao = valor.includes(' ');
  if (verificacao === true) {
    throw new Error('Campo país possui espaco');
  } else {
    return valor;
  }
}
async function validarSenha(senha) {
  await verificaCampoProibido(senha);
  const tamanho = senha.length;
  const letraM = /(?=.*[A-Z])/;
  const letram = /(?=.*[a-z])/;
  const numero = /(?=.\d)/;
  const letraMteste = letraM.test(senha);
  const letramteste = letram.test(senha);
  const letraDteste = numero.test(senha);
  if (tamanho < 5) {
    throw new Error(
      `Senha possui: ${tamanho} caracteres, deve ter pelo menos 5 caracteres`,
    );
  }
  if (letraMteste === false) {
    throw new Error('Senha deve ter pelo menos uma letra maiscula');
  }
  if (letramteste === false) {
    throw new Error('Senha deve ter pelo menos uma letra minuscula');
  }
  if (letraDteste === false) {
    throw new Error('Senha deve ter pelo menos um numero');
  }
  return senha;
}

async function verificaNomeEmailExistente(nome, email) {
  const client = await pool.connect();
  const result = await client.query('SELECT * FROM "Usuario"');
  const usuarios = result.rows;
  const usuariosNome = usuarios.map((usuario) => usuario.nome);
  const usuariosEmail = usuarios.map((usuario) => usuario.email);
  const inclui = usuariosNome.includes(nome);
  const inclui2 = usuariosEmail.includes(email);
  if (inclui === true || inclui2 === true) {
    throw new Error(`Nome: ${nome} ou Email: ${email} ja existentes`);
  } else {
    return nome, email;
  }
}
async function validarEmail(email) {
  const servicosEmail = [
    'gmail.com',
    'hotmail.com',
    'protonmail.com',
    'yahoo.com',
    'icloud.com',
    'aol.com',
    'zoho.com',
    'yandex.com',
    'gmx.com',
    'mail.com',
    'tutanota.com',
    'fastmail.com',
    'mailfence.com',
    'hushmail.com',
  ];
  const key = '@';
  const contaiKey = email.includes(key);
  if (!contaiKey) {
    throw new Error(`Email: ${email} nao contem chave para servicos email: @`);
  }
  const separaEmail = email.split('@');
  const segundaParte = separaEmail[1];
  const primeiraParte = separaEmail[0];
  await verificaCampoProibido(primeiraParte);
  const verificado = servicosEmail.includes(segundaParte);
  if (verificado === false) {
    throw new Error('Formato de email indisponivel');
  }
  const verificarEmail = servicosEmail.some((servico) =>
    email.includes(servico),
  );
  if (!verificarEmail) {
    throw new Error('Servico de email invalido');
  } else {
    return email;
  }
}
module.exports.inserirUsuario = async (valores) => {
  const corpo = valores.body;
  const corpoObjeto = JSON.parse(corpo);
  const id = randomUUID();
  const nomeOb = corpoObjeto.nome;
  await verificaEspacoNome(nomeOb);
  const senha = corpoObjeto.senha;
  await verificaEspacoSenha(senha);
  await validarSenha(senha);
  const sal = await bcrypt.genSalt(12);
  const senhaHasheada = await bcrypt.hash(senha, sal);
  const emailOb = corpoObjeto.email;
  await verificaEspacoEmail(emailOb);
  await validarEmail(emailOb);
  const idadeOb = corpoObjeto.idade;
  if (idadeOb < 18 || idadeOb > 120) {
    throw new Error(`Idade ${idadeOb} invalida`);
  }
  const paísOb = corpoObjeto.país;
  await verificaEspacoPaís(paísOb);
  await verificaNomeEmailExistente(nomeOb, emailOb);
  const query =
    'INSERT INTO "Usuario" (id, nome, senha, email, idade, país) VALUES ($1, $2, $3, $4, $5, $6)';

  const values = [id, nomeOb, senhaHasheada, emailOb, idadeOb, paísOb];

  const cliente = await pool.connect();

  try {
    await cliente.query(query, values);
    cliente.release();
    return ['Usuário criado com sucesso:', values];
  } catch (error) {
    cliente.release();
    throw new Error('Erro ao inserir usuário:', values);
  }
};

module.exports.ListarUsuarios = async () => {
  const client = await pool.connect();
  const result = await client.query('SELECT * FROM "Usuario"');
  const usuarios = result.rows;
  client.release();
  return ['Usuarios:', usuarios];
};

module.exports.listarUmUsuario = async (value) => {
  const { id } = value.pathParameters;
  const idParam = String(id);
  const client = await pool.connect();
  const result = await client.query('SELECT * FROM "Usuario"');
  const usuarios = result.rows;
  const usuario = usuarios.find((usuario) => usuario.id === idParam);

  if (usuario) {
    client.release();
    return ['Usuario:', usuario];
  } else {
    client.release();
    throw new Error(`Usuario do id: ${idParam} nao existente`);
  }
};
async function verificaTokenBearer(usuario, Token) {
  const decode = jwt.decode(Token);
  const idDecode = decode.id;
  if (usuario.id !== idDecode) {
    throw new Error(`Usuario: ${usuario.nome} nao e dono desse token`);
  } else {
    return usuario;
  }
}
module.exports.apagarUsuario = async (value) => {
  const { id } = value.pathParameters;
  const valorHeader = value.headers.authorization;
  if (valorHeader === undefined) {
    throw new Error('Token precisa ser inserido');
  }
  const Token = valorHeader.split(' ')[1];
  const chaveBearer = valorHeader.split(' ')[0];
  if (chaveBearer !== 'Bearer') {
    throw new Error('Token precisa ser Bearer');
  }
  const idParam = String(id);
  const client = await pool.connect();
  const result = await client.query('SELECT * FROM "Usuario" WHERE id = $1', [
    idParam,
  ]);
  const usuario = result.rows[0];

  if (usuario) {
    await verificaTokenBearer(usuario, Token);
    await client.query('DELETE FROM "Usuario" WHERE id = $1', [idParam]);
    client.release();
    return {
      message: `Usuario deletado:`,
      usuario,
    };
  } else {
    client.release();
    throw new Error(`Usuario com id: ${idParam} nao existe`);
  }
};
module.exports.AtualizaUsuario = async (values) => {
  const Body = values.body;
  const { id } = values.pathParameters;
  const valorHeader = values.headers.authorization;
  if (valorHeader === undefined) {
    throw new Error('Token precisa ser inserido');
  }
  const Token = valorHeader.split(' ')[1];
  const chaveBearer = valorHeader.split(' ')[0];
  if (chaveBearer !== 'Bearer') {
    throw new Error('Token precisa ser Bearer');
  }
  const idParam = String(id);
  const corpoOb = JSON.parse(Body);
  const nome = corpoOb.nome;
  await verificaEspacoNome(nome);
  const senha = corpoOb.senha;
  await verificaEspacoSenha(senha);
  await validarSenha(senha);
  const sal = await bcrypt.genSalt(12);
  const senhaHasheada = await bcrypt.hash(senha, sal);
  const email = corpoOb.email;
  await verificaEspacoEmail(email);
  await validarEmail(email);
  const idade = corpoOb.idade;
  if (idade < 18 || idade > 120) {
    throw new Error(`Idade ${idade} invalida`);
  }
  const país = corpoOb.país;
  await verificaEspacoPaís(país);
  const client = await pool.connect();
  const result = await client.query('SELECT * FROM "Usuario" WHERE id = $1', [
    idParam,
  ]);
  const usuario = result.rows[0];
  if (usuario) {
    await verificaTokenBearer(usuario, Token);
    const query = `UPDATE "Usuario" SET "nome" = $2, "senha" = $3, "email" = $4, "idade" = $5, "país" = $6 WHERE id = $1`;
    const values = [usuario.id, nome, senhaHasheada, email, idade, país];
    await client.query(query, values);
    const usuarioAtualizado = {
      id: usuario.id,
      nome: nome,
      senha: senhaHasheada,
      email: email,
      idade: idade,
      país: país,
      videofoto: usuario.videofoto,
    };
    client.release();
    return [`Usuario do id: ${idParam} atualizado:`, usuarioAtualizado];
  } else {
    client.release();
    throw new Error(`Usuario do id: ${idParam} inexistente`);
  }
};
module.exports.LoginUsuario = async (values) => {
  const Body = values.body;
  const { id } = values.pathParameters;
  const idParam = String(id);
  const corpoOb = JSON.parse(Body);
  const senha = corpoOb.senha;
  const email = corpoOb.email;
  const client = await pool.connect();
  const result = await client.query('SELECT * FROM "Usuario"');
  const usuarios = result.rows;
  const usuario = usuarios.find((usuario) => usuario.id === idParam);

  if (usuario) {
    try {
      const senhaUsuarioParam = usuario.senha;
      const nomeUsuarioParam = usuario.nome;
      const senhaVerifica = await bcrypt.compare(senha, senhaUsuarioParam);
      if (usuario.email !== email || senhaVerifica === false) {
        throw new Error(
          `Sr ${nomeUsuarioParam}, Email: ${email} invalido ou Senha: ${senha} invalida`,
        );
      }
      const payload = {
        id: usuario.id,
        nome: usuario.nome,
        email: usuario.email,
      };
      const Token = jwt.sign(payload, process.env.JWTSECRET);
      client.release();
      return ['Login feito, seu Token:', Token];
    } catch (error) {
      client.release();
      throw new Error(error);
    }
  } else {
    throw new Error(`Usuario com id:${idParam} nao existe`);
  }
};
