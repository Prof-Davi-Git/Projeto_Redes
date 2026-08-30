/* Lista de alunos para autenticação local.
   Os nomes são abreviados para reduzir exposição no site público.
   A senha NÃO fica armazenada em texto puro.
   Regra atual: 6 últimos dígitos do RA + dígito.
   A validação usa PBKDF2-SHA256 com salt individual.
*/
window.ALUNOS_AUTENTICACAO = Object.freeze(
[
  {
    "nome": "Beatriz S. P.",
    "salt": "dBXfe9dNZ0MZOkZcjfDKEg==",
    "hash": "0d93OP44aERlbVeiMBNqMTHVtrxNVai4LRUk5lM/AfE=",
    "iteracoes": 120000
  },
  {
    "nome": "Brenno S. T.",
    "salt": "m4Q6efQYgL5CPy/RFEXs9g==",
    "hash": "Lp2ibQ5SjX4Q4jVmnespdGJHhssOy3XGirfavNGCBv8=",
    "iteracoes": 120000
  },
  {
    "nome": "Danielle L. S. M.",
    "salt": "Pqikt+IW1xHDp55ifmejlQ==",
    "hash": "mBFWNmDoD6ifj8oZ3JdqP3SJWJRbxbeLnrzkXKSB0Ps=",
    "iteracoes": 120000
  },
  {
    "nome": "Eduardo L. O. N.",
    "salt": "5Thj7qSBI8jtbBr0bC8yzA==",
    "hash": "k1oK7LbkdcnAGG7o0vM9p/V6WZVtXTcZHV9/zXjdj4I=",
    "iteracoes": 120000
  },
  {
    "nome": "Fernanda M. F.",
    "salt": "cfmIZFZm3UxBlKRIHOhXbQ==",
    "hash": "PesqYwFWNCyQMD9RCP0HKjnHt8y5o0yJCrBBi3R6W70=",
    "iteracoes": 120000
  },
  {
    "nome": "Giovanna A. M.",
    "salt": "d1k/cx805oJxOuNdGHxeeQ==",
    "hash": "YH3kaEN6kD8kJV+trcAk6jPLFcFhYY65kFGbF3lEDS8=",
    "iteracoes": 120000
  },
  {
    "nome": "Gustavo Felix L.",
    "salt": "kBoqmwtoDc1RiMfkOp8vIA==",
    "hash": "nQZ29ipC1Bn9qFR5W+pLkSLIWqAdphGu3P5w5oczkgQ=",
    "iteracoes": 120000
  },
  {
    "nome": "Gustavo Ferreira L.",
    "salt": "qxFWOJkl862lnK342zvUGQ==",
    "hash": "gUhWF7GaUce6npbfMe6M1SGJdojal4QB0mqKu4dT+z0=",
    "iteracoes": 120000
  },
  {
    "nome": "Heloise B. G.",
    "salt": "IsrUbZmxDlDmLQvITiHUkA==",
    "hash": "zR69nlccLH8RUIE4Ra1DmQXIk3RXTKEiJZ5+FToweMg=",
    "iteracoes": 120000
  },
  {
    "nome": "Henrique M. S. M. M.",
    "salt": "kAopNaERlwQ2jSpqCoLQHw==",
    "hash": "WtEzYTmOLndIdRMlGYQlXaxQS4994kiPexb1BVoO890=",
    "iteracoes": 120000
  },
  {
    "nome": "Henry K. O. F.",
    "salt": "CMUc10PHJURpctf8zh0duQ==",
    "hash": "yUoqtGpaxrB53DjwtTXMrOOMKrE8Y0oCdmnsFA/bxbw=",
    "iteracoes": 120000
  },
  {
    "nome": "Isaac S. O.",
    "salt": "M3CSTAbKd3U5xFzQQEJf7A==",
    "hash": "c9cga9icggeurmDOrDWO07M1tqGV25KBViiBJ6tVpoE=",
    "iteracoes": 120000
  },
  {
    "nome": "Isabella V. R. S.",
    "salt": "TBKKiwufcpGkWA1OvBRTNQ==",
    "hash": "DiYV+/NMXVw+7EGb20RdL3204MmaRSG1a0/EWTvfJM4=",
    "iteracoes": 120000
  },
  {
    "nome": "Lauro M. G. S.",
    "salt": "oEIsZKy0pgH3UfOI9wGj2g==",
    "hash": "S+k73vs9vraWMfZ/7x4r70BRnNyUpOklTk2Zw32EEcs=",
    "iteracoes": 120000
  },
  {
    "nome": "Lucas B. S.",
    "salt": "mV1c4B60/uJoAaswzd3rpg==",
    "hash": "t706gefMrdUD4QiItts3pyLbApfN1h6d3mcECVyoNpg=",
    "iteracoes": 120000
  },
  {
    "nome": "Luis F. B. M.",
    "salt": "EdsE5j+wcH2C/LK4JkiKCw==",
    "hash": "yiXQ+kIAN1L5Bcq1bYH180RzP10cqMV2pv9jucHKyVg=",
    "iteracoes": 120000
  },
  {
    "nome": "Luiz H. S. F.",
    "salt": "BdwpkrCHq44yCmMQWfRbcQ==",
    "hash": "Knakc2lXk5uDL4DrKGVOpY54HLiZzlvQIfeVfuQdsZI=",
    "iteracoes": 120000
  },
  {
    "nome": "Luiz V. F. C.",
    "salt": "TZaUztQvrSoYohOW6q48DA==",
    "hash": "isnCOwDKZHKRJQlN501u0FfDX5yx6Z5sQX0C1KG/jdI=",
    "iteracoes": 120000
  },
  {
    "nome": "Marcello C. H. B.",
    "salt": "U9zjkt5Ys9x7OK/FCthpyw==",
    "hash": "UYrVQ6thwn+jt1bBYrMLncW2JpdamEhqVCIQReHmvuw=",
    "iteracoes": 120000
  },
  {
    "nome": "Marcos V. A. M.",
    "salt": "UmWcIMyLy9SoxifzHe2SUQ==",
    "hash": "0zQAmnirjiRa+yZDtlCVXMe+fVSzITTLYDbrXb4JB5I=",
    "iteracoes": 120000
  },
  {
    "nome": "Matheus V. S.",
    "salt": "VFL2IHvRI11YoJNfOzyLVg==",
    "hash": "YW+V7YiPYW3ujAV8AitKerVnREDG7Bj8VmUWc2yBM8o=",
    "iteracoes": 120000
  },
  {
    "nome": "Micaelly F. A.",
    "salt": "/C5BPQEEUAPkfT99+YeA1g==",
    "hash": "poY0eL3jsinw7OglTfZllElGnU7xbPdykeruMY8qNr4=",
    "iteracoes": 120000
  },
  {
    "nome": "Miguel C. S.",
    "salt": "FNFHdydsfZ+9qd3jlAjQnw==",
    "hash": "dXn9ZrKplN2+Rk/yAKvyyIyCGZkl5zWX63wz49OOCJs=",
    "iteracoes": 120000
  },
  {
    "nome": "Miguel H. O. G.",
    "salt": "tp37nqBma3AdMxf8eQ5rtQ==",
    "hash": "Z6MPUz+wTE0W2EMsNrQqlpl9rhr/S948VlaZzMqqV/4=",
    "iteracoes": 120000
  },
  {
    "nome": "Mikaela F. M. R.",
    "salt": "I1aPvV9qD/UbZsz1wnOl6A==",
    "hash": "Y6MsykpT8Azo+xtibOihdZ7UUdLanCbHMvNgcERKJVI=",
    "iteracoes": 120000
  },
  {
    "nome": "Murillo H. S.",
    "salt": "4GiisDqcvmbd44N5q6/KkQ==",
    "hash": "2TSElmvfX00dOC8ir3GAYrRrog1QUuVr2bQaHaZhMbc=",
    "iteracoes": 120000
  },
  {
    "nome": "Murilo S. C.",
    "salt": "tziOvxAZce56k3KKXeHWVQ==",
    "hash": "ncO1zGHTsmeVQcRyJ5zk56xEnRA3kFITq7+y9drbuTo=",
    "iteracoes": 120000
  },
  {
    "nome": "Murilo R. S.",
    "salt": "vqx7sUApBPl0HIgRCV3J+w==",
    "hash": "FN4ox9+Y0wRd6Gb0ugDQeP8u8ysL2Ct3V7aEQLxjvcM=",
    "iteracoes": 120000
  },
  {
    "nome": "Natan S. L.",
    "salt": "MH1aVQ+g7y+q+9GAJEU9yQ==",
    "hash": "AMpIqJG1ohkpmGNo5UCWZuz6dTSuEzWVJ8yYFYh7fB0=",
    "iteracoes": 120000
  },
  {
    "nome": "Nicolas C. S.",
    "salt": "eOLpw8Qub/aFgRit7dvpeg==",
    "hash": "AE9qmxa9z6gkh7Ml8Gm3QPP1iQB7NqoezwxqqBZHRsk=",
    "iteracoes": 120000
  },
  {
    "nome": "Pablo R. S. J.",
    "salt": "LpoSLlz+6XMGCNq3KQUQrg==",
    "hash": "0uzXlKqQ4UxdAPmaXnZra4ik2TpgcHRy5u+vNIi1PvU=",
    "iteracoes": 120000
  },
  {
    "nome": "Pedro G. S. R.",
    "salt": "YHPKdlBUYSMf0L5fsRquVg==",
    "hash": "Csvevsh5TIPpg3ohqrtUtVTcOvjawWEsTEv4PYIOUhk=",
    "iteracoes": 120000
  },
  {
    "nome": "Pyetro H. S. R.",
    "salt": "KVBEn5z8MDahVY8Ddu23Ag==",
    "hash": "rXL4kRJCB+oVGIup36sRwH3K8z7bkN+FgiR0s7bMNPQ=",
    "iteracoes": 120000
  },
  {
    "nome": "Sophia A. C.",
    "salt": "9eQP555ssIN2Fo5ouARnJg==",
    "hash": "cqhKboPJOqN78VWnBM8+OywXN8Tc2vPgApBGdxaes4o=",
    "iteracoes": 120000
  },
  {
    "nome": "Sophia S. A. C.",
    "salt": "01tQpcZKFg63+Z2Wf7bt6A==",
    "hash": "YfJfcHnhBZYASb1j8PoY0kp7nmCpk0ch2I+u2QMvdgk=",
    "iteracoes": 120000
  },
  {
    "nome": "Thiago V. D.",
    "salt": "JX7nHpJURuJmQ1hXFHY8VQ==",
    "hash": "dHtnxhijmoFthYhfG2oaTAFwsfOU6DBehgT3iGh1v/s=",
    "iteracoes": 120000
  },
  {
    "nome": "Lisandro F. S. S.",
    "salt": "EnEDsyQaIuejkHZcyxp2RQ==",
    "hash": "npDcD81Vbkg6BvE1Vo9DXZ6E1HKEg+hJ5aPoKYVGswc=",
    "iteracoes": 120000
  },
  {
    "nome": "Pedro H. S.",
    "salt": "oS99MNeCcC9IppbI+ra7bg==",
    "hash": "4IUgv0H+iOI8VoTAr8HdzEhx+MXDSrbiv92xufrq1Yc=",
    "iteracoes": 120000
  },
  {
    "nome": "Vitor E. S. N.",
    "salt": "sTYSBNIsJyTTrzO3hTPtAg==",
    "hash": "Cv9wEUzLO6b1Nk/BB4g+HJbGScBgksIMuV116Wx+u1o=",
    "iteracoes": 120000
  }
]
);
