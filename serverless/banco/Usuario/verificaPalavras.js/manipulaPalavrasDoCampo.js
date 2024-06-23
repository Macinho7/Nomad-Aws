const arrayS = ['palavras proibidas', '...'];
async function verificaCampoProibido(valor) {
  for (const valorArray of arrayS) {
    const verifica = valor.includes(valorArray);
    if (verifica === true) {
      throw new Error('Palavra proibida encontrada');
    }
  }
  return valor;
}

module.exports = { verificaCampoProibido };
