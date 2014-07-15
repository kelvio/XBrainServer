/**
 * Created by kelvio on 07/07/14.
 */
var io = require('socket.io', '0.9.4').listen(8080);

var clients = [];
var jogos = [];


io.sockets.on('connection', function (client) {

    var jogador = new Jogador(client.id);

    client.emit('welcome', { id: client.id, message: 'Escolha um oponente'}); //Envia mensagem de boas vindas
    client.emit('players', { players:  obterListaJogadores() }); //Envia a lista de jogadores para o cliente

    client.on('data', function (data) {

        try {
            var jogador = obterJogador(client.id);
            jogador.setNome(data.nome);
            jogador.setOperacao(data.operacao);
            jogador.setOpcao(data.opcao);
            jogador.setInterativo(data.interativo);

            for (var i = 0; i < clients.length; i++) {

                var j = clients[i];
                if (j.getId() != jogador.getId() && j.getOperacao() == jogador.getOperacao() && j.getOpcao() == jogador.getOpcao() && j.isInterativo() == jogador.isInterativo()) {
                    io.sockets.sockets[j.getId()].emit('new-player', { id: jogador.getId(), nome: jogador.getNome() });
                }

            }
        } catch (e) {

        }


    }); //Define dados do jogador

    client.on('challenge', function(data) {

        try {
            var desafiante = obterJogador(parseInt(client.id));
            io.sockets.sockets[data.id].emit('challenge', { id: desafiante.getId(), nome: desafiante.getNome() });
        } catch (e) {

        }

    });

    client.on('challenge-accepted', function(data) {

        try {
            var desafiante = obterJogador(data.id);

            var idJogo = parseInt((Math.random() * 100000000) + 1);
            var jogo = new Jogo(idJogo, obterJogador(desafiante.getId()), obterJogador(client.id), gerarPedras());
            jogo.setInterativo(desafiante.isInterativo());
            jogos.push(jogo);

            io.sockets.sockets[data.id].emit('challenge-accepted', { id: idJogo, pedras: jogo.getPedrasPerspectivaJogadorA(), nomeOponente: obterJogador(client.id).getNome(), desafiante:true});
            client.emit('challenge-accepted', { id: idJogo, pedras: jogo.getPedrasPerspectivaJogadorB(), nomeOponente: desafiante.getNome(), desafiante:false });
        } catch (e) {

        }



    });

    client.on('challenge-rejected', function(data) {

        try {
            var desafiante = obterJogador(client.id);
            io.sockets.sockets[parseInt(data.id)].emit('challenge-accepted', { id: desafiante.getId(), nome: desafiante.getNome() });
        } catch (e) {

        }

    });

    client.on('answer', function(data) {
        try {
            var jogo = obterJogo(data.serverId);
            jogo.computarResposta(data);
            var jogadorA = jogo.getJogadorA();
            var jogadorB = jogo.getJogadorB();
            io.sockets.sockets[jogadorA.getId()].emit('score', { pontuacao:jogo.getPontuacaoJogadorA(), pontuacaoOponente: jogo.getPontuacaoJogadorB(), nome: jogadorA.getNome(), nomeOponente: jogadorB.getNome() });
            io.sockets.sockets[jogadorB.getId()].emit('score', { pontuacao:jogo.getPontuacaoJogadorB(), pontuacaoOponente: jogo.getPontuacaoJogadorA(), nome: jogadorB.getNome(), nomeOponente: jogadorA.getNome() });
        } catch (e) {

        }

    });

    client.on('move', function(data) {

        try {

            var jogo = obterJogo(data.serverId);

            var jogadorA = jogo.getJogadorA();
            var jogadorB = jogo.getJogadorB();

            var dirX = data.dirX;
            var dirY = data.dirY;

            if (data.cor == "azul") { //Jogador A

                jogo.moverPedraPerspectivaJogadorA(data.numero, data.cor, dirX, dirY, client);

                //Envia jogada para o oponente
                var m = jogo.converterMovimentoJogadorParaPerspectivaJogadorB(data.dirX, data.dirY);
                io.sockets.sockets[jogadorB.getId()].emit('move', { numero:data.numero, cor:data.cor, dirY:m.dirY, dirX:m.dirX});

            } else { //Jogador B

                jogo.moverPedraPerspectivaJogadorB(data.numero, data.cor, dirX, dirY, client);
                //Envia jogada para o oponente
                var m = jogo.converterMovimentoJogadorParaPerspectivaJogadorA(data.dirX, data.dirY);
                io.sockets.sockets[jogadorA.getId()].emit('move', { numero:data.numero, cor:data.cor, dirY:m.dirY, dirX:m.dirX});

            }

            io.sockets.sockets[jogadorA.getId()].emit('score', { pontuacao:jogo.getPontuacaoJogadorA(), pontuacaoOponente: jogo.getPontuacaoJogadorB(), nome: jogadorA.getNome(), nomeOponente: jogadorB.getNome() });
            io.sockets.sockets[jogadorB.getId()].emit('score', { pontuacao:jogo.getPontuacaoJogadorB(), pontuacaoOponente: jogo.getPontuacaoJogadorA(), nome: jogadorB.getNome(), nomeOponente: jogadorA.getNome() });



        } catch (e) {


        }


        //Atualiza a pontuação de ambos os jogadores

    });

    clients.push(jogador);
    //io.sockets.emit('new-player', { id: jogador.id, nome: jogador.nome });



    //client.on('send', function (data) {
    //    io.sockets.emit('message', data);
    //});

    client.on('disconnect', function() {
        try {
            clients.splice(clients.indexOf(obterJogador(client.id)), 1);
        } catch (e) {

        }

    });

});

var obterJogador = function(id) {

    for (var i = 0; i < clients.length; i++) {
        var client = clients[i];
        if (client.getId() == id) {
            return client;
        }
    }
    return null;
}

var obterCliente = function(id) {
    for (var i = 0; i < clients.length; i++) {
        var client = clients[i];
        if (client.id == id) {
            return client;
        }
    }
    return null;
};

var definirDados = function(id, data) {
    for (var i = 0; i < clients.length; i++) {
        var client = clients[i];
        if (client.id == id) {
            client.nome = data.nome
            console.log("Ok, definido");
            break;
        }
    }
};

var obterListaJogadores = function() {
    var dados = [];
    for (var i = 0; i < clients.length; i++) {
        dados.push({ id: clients[i].getId(), nome: clients[i].getNome() });
    }
    return dados;
};

var Jogo = function(id, jogadorA, jogadorB, pedras) {
    var _id = id, _jogadorA = jogadorA, _jogadorB = jogadorB, _pedras = pedras;

    var _pontuacaoJogadorA = 0, _pontuacaoJogadorB = 0;

    var operacao = "soma";

    var _interativo = true;

    var getId = function() {
        return _id;
    };

    var setId = function(id) {
        _id = id;
    };

    var converterMovimentoJogadorParaPerspectivaJogadorA = function(dirX, dirY) {

        /*var novaLinha = 0;

        if (linha == 7) {
            novaLinha = 0;
        } else if (linha == 6) {
            novaLinha = 1;
        } else if (linha == 5) {
            novaLinha = 2;
        } else if (linha == 4) {
            novaLinha = 3;
        } else if (linha == 3) {
            novaLinha = 4;
        } else if (linha == 2) {
            novaLinha = 5;
        } else if (linha == 1) {
            novaLinha = 6;
        } else if (linha == 0) {
            novaLinha = 7;
        }*/

        return { dirX: dirX, dirY: -dirY };
    };

    var converterMovimentoJogadorParaPerspectivaJogadorB = function(dirX, dirY) {

        return { dirX: dirX, dirY: -dirY };

        /*var novaLinha = 0;

        if (linha == 7) {
            novaLinha = 0;
        } else if (linha == 6) {
            novaLinha = 1;
        } else if (linha == 5) {
            novaLinha = 2;
        } else if (linha == 4) {
            novaLinha = 3;
        } else if (linha == 3) {
            novaLinha = 4;
        } else if (linha == 2) {
            novaLinha = 5;
        } else if (linha == 1) {
            novaLinha = 6;
        } else if (linha == 0) {
            novaLinha = 7;
        }
*/
        return { linha: linha, coluna:coluna };
    };

    var computarResposta = function(data) {

        var resultado = eval(data.a + data.operador + data.b);

        var certo = false;
        if (resultado == data.alternativaA && data.opcaoSelecionada == "a") {

            certo = true;

        } else if (resultado == data.alternativaB && data.opcaoSelecionada == "b") {


            certo = true;

        } else if (resultado == data.alternativaC && data.opcaoSelecionada == "c") {


            certo = true;

        } else if (resultado == data.alternativaD && data.opcaoSelecionada == "d") {


            certo = true;


        } else {

            certo = false;


        }

        if (certo) {

            if (operacao == "soma" || operacao == "multiplicacao") {
                if (data.cor == "azul") {
                    _pontuacaoJogadorA += resultado;
                } else {
                    _pontuacaoJogadorB += resultado;
                }
            } else {
                if (data.cor == "azul") {
                    _pontuacaoJogadorB -= resultado;
                } else {
                    _pontuacaoJogadorA -= resultado;
                }
            }

        } else {
            if (operacao == "soma" || operacao == "multiplicacao") {
                if (data.cor == "azul") {
                    _pontuacaoJogadorB += resultado;
                } else {
                    _pontuacaoJogadorA += resultado;
                }
            } else {
                if (data.cor == "azul") {
                    _pontuacaoJogadorA -= resultado;
                } else {
                    _pontuacaoJogadorB -= resultado;
                }
            }
        }

    };

    var moverPedraPerspectivaJogadorA = function(numero, cor, dirX, dirY, client) {

        var novaLinha = null;
        var novaColuna = null;
        out:
        for (var linha = 0; linha < _pedras.length; linha++) {

            for (var coluna = 0; coluna < _pedras[linha].length; coluna++) {

                var pedra = _pedras[linha][coluna];
                if (pedra != null && pedra.cor == cor && pedra.numero == numero) {

                    novaLinha = dirY > 0 ? pedra.linha - 1 : pedra.linha + 1;
                    novaColuna = dirX > 0 ? pedra.coluna + 1 : pedra.coluna - 1;



                    var alvo = _pedras[novaLinha][novaColuna];
                    if (alvo != null) {


                        var numeroPedraJogador = pedra.numero;
                        var numeroPedraOponente = alvo.numero;

                        if (!_interativo) {
                            var resultado = 0;
                            if (operacao == "soma") {

                                resultado = pedra.numero + alvo.numero;

                            }

                            if (pedra.cor == "azul") {
                                _pontuacaoJogadorA += resultado;
                            } else {
                                _pontuacaoJogadorB += resultado;
                            }
                        } else {

                            var op = null;
                            var alternativas = [];
                            if (operacao == "soma") {

                                op = "+";
                                alternativas.push(numeroPedraJogador + numeroPedraOponente);
                                while (alternativas.length < 4) {
                                    var n = numeroPedraJogador + Math.floor(Math.random() * 10);
                                    if (alternativas.indexOf(n) != -1) {
                                        continue;
                                    } else {
                                        alternativas.push(n);
                                    }
                                }
                                alternativas = shuffle(alternativas);
                            }

                            if (operacao == "subtracao") {
                                op = "-";
                                alternativas = [];
                                alternativas.push(numeroPedraJogador - numeroPedraOponente);
                                while (alternativas.length < 4) {
                                    var n = numeroPedraJogador - Math.floor(Math.random() * 10);
                                    if (alternativas.indexOf(n) != -1) {
                                        continue;
                                    } else {
                                        alternativas.push(n);
                                    }
                                }
                                alternativas = shuffle(alternativas);
                            }

                            if (operacao == "multiplicacao") {
                                op = "*";
                                alternativas = [];
                                alternativas.push(numeroPedraJogador * numeroPedraOponente);
                                while (alternativas.length < 4) {
                                    var n = numeroPedraJogador * Math.floor(Math.random() * 10);
                                    if (alternativas.indexOf(n) != -1) {
                                        continue;
                                    } else {
                                        alternativas.push(n);
                                    }
                                }
                                alternativas = shuffle(alternativas);
                            }

                            if (operacao == "divisao") {
                                alternativas = [];

                                op = "/";
                                if (opcao == "decimal") {
                                    alternativas.push(numeroPedraJogador / numeroPedraOponente);
                                    while (alternativas.length < 4) {
                                        var n = numeroPedraJogador / Math.floor(Math.random() * 10);
                                        if (alternativas.indexOf(n) != -1) {
                                            continue;
                                        } else {
                                            alternativas.push(n);
                                        }
                                    }
                                    alternativas = shuffle(alternativas);
                                } else {

                                    alternativas.push(numeroPedraJogador + "/" + numeroPedraOponente);
                                    while (alternativas.length < 4) {
                                        var n = numeroPedraJogador + "/" + Math.floor(Math.random() * 10);
                                        if (alternativas.indexOf(n) != -1) {
                                            continue;
                                        } else {
                                            alternativas.push(n);
                                        }
                                    }
                                    alternativas = shuffle(alternativas);

                                }


                            }


                            client.emit('prompt', { questao: numeroPedraJogador + ' ' + (op == '*' ? 'x' : op) + ' ' + numeroPedraOponente + ' = ?', a:numeroPedraJogador, b:numeroPedraOponente, operador:op, alternativaA:alternativas[0], alternativaB:alternativas[1], alternativaC:alternativas[2], alternativaD:alternativas[3], cor: pedra.cor });
                        }


                    }





                    pedra.linha = novaLinha;
                    pedra.coluna = novaColuna;
                    _pedras[linha][coluna] = null;
                    _pedras[novaLinha][novaColuna] = pedra;
                    break out;
                }

            }

        }

    };

    var moverPedraPerspectivaJogadorB = function(numero, cor, dirX, dirY, client) {

        var c = converterMovimentoJogadorParaPerspectivaJogadorA(dirX, dirY);
        moverPedraPerspectivaJogadorA(numero, cor, c.dirX, c.dirY);

    };

    var getPontuacaoJogadorA = function() {
        return _pontuacaoJogadorA;
    };

    var getPontuacaoJogadorB = function() {
        return _pontuacaoJogadorB;
    };

    var getPedras = function() {
        return _pedras;
    };

    var setPedras = function(pedras) {
        _pedras = pedras;
    };

    var getJogadorA = function() {
        return _jogadorA;
    };

    var getJogadorB = function() {
        return _jogadorB;
    };

    var setJogadorA = function(jogadorA) {
        _jogadorA = jogadorA;
    };

    var setJogadorB = function(jogadorB) {
        _jogadorB = jogadorB;
    };

    var getPedrasPerspectivaJogadorA = function() {
        return _pedras;
    };

    var isInterativo = function() {
        return _interativo;
    };

    var setInterativo = function(interativo) {
        _interativo = interativo;
    };

    var getPedrasPerspectivaJogadorB = function() {

        var pedras = [];
        var old = _pedras.reverse();
        for (var i = 0; i < old.length; i++) {
            pedras.push([]);
            for (var j = 0; j < old[i].length; j++) {

                var p = old[i][j];
                if (p == null) {
                    pedras[i].push(null);
                    continue;
                }
                var novaLinha = 0;
                var linha = p.linha;
                if (linha == 7) {
                    novaLinha = 0;
                } else if (linha == 6) {
                    novaLinha = 1;
                } else if (linha == 5) {
                    novaLinha = 2;
                } else if (linha == 4) {
                    novaLinha = 3;
                } else if (linha == 3) {
                    novaLinha = 4;
                } else if (linha == 2) {
                    novaLinha = 5;
                } else if (linha == 1) {
                    novaLinha = 6;
                } else if (linha == 0) {
                    novaLinha = 7;
                }

                pedras[i].push({ numero: p.numero, linha:novaLinha, coluna: p.coluna, cor: p.cor });

            }
        }

        return pedras;

    };

    var setOperacao = function(operacao) {
        operacao = operacao;
    };

    var setOpcao = function(opcao) {
        opcao = opcao;
    }

    return {
        getId: getId,
        setId: setId,
        getJogadorA: getJogadorA,
        setJogadorA: setJogadorA,
        getJogadorB: getJogadorB,
        setJogadorB: setJogadorB,
        getPedras: getPedras,
        setPedras: setPedras,
        getPedrasPerspectivaJogadorA: getPedrasPerspectivaJogadorA,
        getPedrasPerspectivaJogadorB: getPedrasPerspectivaJogadorB,
        converterMovimentoJogadorParaPerspectivaJogadorA: converterMovimentoJogadorParaPerspectivaJogadorA,
        converterMovimentoJogadorParaPerspectivaJogadorB: converterMovimentoJogadorParaPerspectivaJogadorB,
        moverPedraPerspectivaJogadorA: moverPedraPerspectivaJogadorA,
        moverPedraPerspectivaJogadorB: moverPedraPerspectivaJogadorB,
        getPontuacaoJogadorA: getPontuacaoJogadorA,
        getPontuacaoJogadorB: getPontuacaoJogadorB,
        isInterativo: isInterativo,
        setInterativo: setInterativo,
        computarResposta: computarResposta,
        setOperacao: setOperacao,
        setOpcao: setOpcao
    }
};

function obterJogo(id) {

    for (var i = 0; i < jogos.length; i++) {
        var jogo = jogos[i];
        if (jogo.getId() == id) {
            return jogo;
        }
    }

}

function gerarPedras() {

    //Example, including customisable intervals [lower_bound, upper_bound)
    var limit = 10,
        amount = 11,
        lower_bound = 0,
        upper_bound = 10,
        nl = [],
        na = [];

    if (amount > limit) limit = amount; //Infinite loop if you want more unique
    //Natural numbers than existemt in a
    // given range
    while (nl.length < limit) {
        var random_number = Math.round(Math.random()*(upper_bound - lower_bound) + lower_bound);
        if (nl.indexOf(random_number) == -1) {
            // Yay! new random number
            nl.push( random_number );

        }
    }

    while (na.length < limit) {
        var random_number = Math.round(Math.random()*(upper_bound - lower_bound) + lower_bound);
        if (na.indexOf(random_number) == -1) {
            // Yay! new random number
            na.push( random_number );

        }
    }

    var pedras = [
        [laranja(nl[0], 0, 0), null, laranja(nl[1], 0, 2), null, laranja(nl[2], 0, 4), null, laranja(nl[3], 0, 6), null, laranja(nl[4], 0, 7), null, laranja(nl[5], 0, 9)],
        [null, laranja(nl[6], 1, 1), null, laranja(nl[7], 1, 3), null, laranja(nl[8], 1, 5), null, laranja(nl[9], 1, 7), null, laranja(nl[10], 1, 9), null],
        [null, null, null, null, null, null, null, null, null, null, null],
        [null, null, null, null, null, null, null, null, null, null, null],
        [null, null, null, null, null, null, null, null, null, null, null],
        [null, null, null, null, null, null, null, null, null, null, null],
        [azul(na[5], 6, 0), null, azul(na[6], 6, 2), null, azul(na[7], 6, 4), null, azul(na[8], 6, 6), null, azul(na[9], 6, 8), null, azul(na[10], 6, 10)],
        [null, azul(na[0], 7, 1), null, azul(na[1], 7, 3), null, azul(na[2], 7, 5), null, azul(na[3], 7, 7), null, azul(na[4], 7, 9), null]
    ];

    return pedras;

}

function azul(numero, linha, coluna) {
    return { numero:numero, linha:linha, coluna:coluna, cor:"azul" };
}

function laranja(numero, linha, coluna) {
    return { numero:numero, linha:linha, coluna:coluna, cor:"laranja" };
}



var Jogador = function(id, nome) {
    var _id = id,
        _nome = nome, _operacao, _opcao, _interativo;

    var getId = function() {
        return _id;
    };

    var getNome = function() {
        return _nome;
    };

    var setId = function(id) {
        _id = id;
    };

    var setNome = function(nome) {
        _nome = nome;
    };

    var getOperacao = function() {
        return _operacao;
    };

    var getOpcao = function() {
        return _opcao;
    };

    var setOperacao = function(operacao) {
        _operacao = operacao;
    };

    var setOpcao = function(opcao) {
        _opcao = opcao;
    };

    var isInterativo = function() {
        return _interativo;
    };

    var setInterativo = function(interativo) {
        _interativo = interativo;
    };

    return {
        getId: getId,
        setId: setId,
        getNome: getNome,
        setNome: setNome,
        getOperacao: getOperacao,
        setOperacao: setOperacao,
        getOpcao: getOpcao,
        setOpcao: setOpcao,
        isInterativo: isInterativo,
        setInterativo: setInterativo
    }
};


function shuffle(o) { //v1.0
    for (var j, x, i = o.length; i; j = Math.floor(Math.random() * i), x = o[--i], o[i] = o[j], o[j] = x);
    return o;
};
