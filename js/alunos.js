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
    "salt": "U9O50cqBJKKIjGuIfU53zQ==",
    "hash": "OTui3Jfou3adVhT67HtN1Uak+64Yyn6GwASQKBzHvJs=",
    "iteracoes": 120000
  },
  {
    "nome": "Brenno S. T.",
    "salt": "1QkRJsSAinC5gUd72S0Fcg==",
    "hash": "s5dDNhQhVtx6fC3iCI0JHeNrbV8R8F3n2guAH9Zo84w=",
    "iteracoes": 120000
  },
  {
    "nome": "Danielle L. S. M.",
    "salt": "VZoXj6K1rm+zQFhuAHRYNA==",
    "hash": "qKvUQfrqqmh/9bYhAIz4rN1j2zQie5mGCrPMz0B8shE=",
    "iteracoes": 120000
  },
  {
    "nome": "Eduardo L. O. N.",
    "salt": "F0yQR5E3h/LkPW/1je+YuA==",
    "hash": "ZqQiLl+Vx7hZxQYiYl9DW5lFzCVuX8R0QxpIcKEFsiM=",
    "iteracoes": 120000
  },
  {
    "nome": "Fernanda M. F.",
    "salt": "8vFkYGw+58x1RrWQRq+5sw==",
    "hash": "9k7lNzWEbCfKgQi4xz6TphSNbUwLvD0dd8p9F1Lmgc8=",
    "iteracoes": 120000
  },
  {
    "nome": "Giovanna A. M.",
    "salt": "vY/H2HK4x0N2gqiwKMf+Rw==",
    "hash": "+wt/TIOW2xNZul1kpao+8LpiY6hxuM0x0m9y0SGHDJk=",
    "iteracoes": 120000
  },
  {
    "nome": "Gustavo Felix L.",
    "salt": "Ds9i0d2kHc+mjOoWQhJoQA==",
    "hash": "unH4GNcxd4ETkcLaGB6GDGE6rN9fHIcEThzVM7KTa54=",
    "iteracoes": 120000
  },
  {
    "nome": "Gustavo Ferreira L.",
    "salt": "TZpYvqA65A3XcOHjwFqPGA==",
    "hash": "HcJqxaw0khfnTYn5nAhOIWUoFb/8x4I4NVz5DWb8X6M=",
    "iteracoes": 120000
  },
  {
    "nome": "Heloise B. G.",
    "salt": "E1APeF5tfkDrgdmJM0TTqQ==",
    "hash": "spMIW5ZAuul/B5XSQRIGThjUJYdm6ASWN0vhbvTOXx8=",
    "iteracoes": 120000
  },
  {
    "nome": "Henrique M. S. M. M.",
    "salt": "CLn0QuWtXPtwG8Z9Sxv5tw==",
    "hash": "urjqvryyuYX0U/M1IiMcHdqIgX8I/vV8EfxXxncBpg8=",
    "iteracoes": 120000
  },
  {
    "nome": "Henry K. O. F.",
    "salt": "HqaTlwQr1KWECJuiZwCUpQ==",
    "hash": "F6wQ3wfqGcsgsaWuCy+o+KiHdANMJUrHJPUsMs+nQCA=",
    "iteracoes": 120000
  },
  {
    "nome": "Isaac S. O.",
    "salt": "wR0iXV/JPmTafEAxuaOq1Q==",
    "hash": "MdzVYg7xdpHFKLk5x9EcP1jQtztbcxnfgmivnQ8/pf8=",
    "iteracoes": 120000
  },
  {
    "nome": "Isabella V. R. S.",
    "salt": "vZuBFt7pZu8St7MEBh1Q4g==",
    "hash": "CDRRx1u3TnmR8j3KfZmmMupKaDJocaiK6uYE8TG5nWY=",
    "iteracoes": 120000
  },
  {
    "nome": "Lauro M. G. S.",
    "salt": "MOZWMYv5vsYfxeCvfDW4iA==",
    "hash": "I+Iy3iiL5kHZQz8w+FN0Lu0xa6FOG5TY/xnG2k2Zd3Y=",
    "iteracoes": 120000
  },
  {
    "nome": "Lucas B. S.",
    "salt": "YX+Q6Tt6qI4kPQ1jVpYw1A==",
    "hash": "m9+agYczj3QX/7oNQp8rua8o+KpTrAJHw6OHTEyCfQY=",
    "iteracoes": 120000
  },
  {
    "nome": "Luis F. B. M.",
    "salt": "9Aq3NRqp3+nY5gD4XxGvGw==",
    "hash": "gXQ5FkZfOZZE27tqDgJPSNxDQf5BZpCcqIF3yBIpPn4=",
    "iteracoes": 120000
  },
  {
    "nome": "Luiz H. S. F.",
    "salt": "DySOtFiBjyWTj3/VoWz2+A==",
    "hash": "7bxp1CYu4x5WwWyVkiS8PEWGItlvsdeRCjHiRqBcffA=",
    "iteracoes": 120000
  },
  {
    "nome": "Luiz V. F. C.",
    "salt": "hlP1zpcTRkR0+AQZcCOZ6g==",
    "hash": "8jS8UiP8dH6L2vCpDSmS1KcP9fObAtyF1DLPx5qGhpU=",
    "iteracoes": 120000
  },
  {
    "nome": "Marcello C. H. B.",
    "salt": "bOwESNUq0sQUX2HFxNN73A==",
    "hash": "IoSj7BeYqrzeEYEsrVx0HZUCGGpMGMYXHLGvuZwb/Jw=",
    "iteracoes": 120000
  },
  {
    "nome": "Marcos V. A. M.",
    "salt": "hqCYo/uFU0QKvJ2Lg+bPKw==",
    "hash": "5dbCQgACrhFmuAdnm4EUfWGhWMHBqbW5dZ3V3XkB6fo=",
    "iteracoes": 120000
  },
  {
    "nome": "Matheus V. S.",
    "salt": "k6yPwZ5fSTrlTNZ+sMyCbg==",
    "hash": "Xhju8w9bBKbfkhbjNyeLeJlo9WugvNxDeSoTNmSVRDQ=",
    "iteracoes": 120000
  },
  {
    "nome": "Micaelly F. A.",
    "salt": "ib65ZBnpEwRzfp/gAOcszA==",
    "hash": "BYmlUdGdhTkafDSvTCb7wqL3x4Z+CY0YdnUDsnNrCnE=",
    "iteracoes": 120000
  },
  {
    "nome": "Miguel C. S.",
    "salt": "CtpV7NQ7/bgnxiT6f6zJlg==",
    "hash": "T31Y9F9MdFtb/Q+r+aafFiDs77wSr7/khqPJlrOyBBA=",
    "iteracoes": 120000
  },
  {
    "nome": "Miguel H. O. G.",
    "salt": "Eo67cHf2N3TtdO5dP+7v7Q==",
    "hash": "lqYomMneVDxE/bO4sZx0de0pZQBqgV+ZBNw9hDJaPg8=",
    "iteracoes": 120000
  },
  {
    "nome": "Mikaela F. M. R.",
    "salt": "8uGXJzxEfjtQdhBucPiA2w==",
    "hash": "RqIL5oaI0YI6TgT7EPulxY8I0lPuvUCJPnM4QVYpazg=",
    "iteracoes": 120000
  },
  {
    "nome": "Murillo H. S.",
    "salt": "3HJ6e3W+4fRrLkX9ePBYKg==",
    "hash": "hOFNVGZ8f6Vc0cEVGa4njApI1Ve1CnNZJlKBkv8yLzU=",
    "iteracoes": 120000
  },
  {
    "nome": "Murilo S. C.",
    "salt": "SVFUIzHr3Kt5r1GRF7CzVQ==",
    "hash": "z8Y2vM1u0sWVPUz9L4Jj9BH+0Y0MCzvPScmzwSYFmNk=",
    "iteracoes": 120000
  },
  {
    "nome": "Murilo R. S.",
    "salt": "Txz6fEqVnVUDcWIhY7T3qw==",
    "hash": "RqbC3bGSWgmCf8Df7wIC8uv2MO9qZqvDCryI/bJL4bA=",
    "iteracoes": 120000
  },
  {
    "nome": "Natan S. L.",
    "salt": "pzoCWtI6+a2xF6au1O4ePQ==",
    "hash": "4/rAXsEhJoZm6LjafSd6N+8YKeaZZz6g4SHkQ98YL3g=",
    "iteracoes": 120000
  },
  {
    "nome": "Nicolas C. S.",
    "salt": "8gZqaI64jyxQg6+WqpV5Lg==",
    "hash": "xSWbMzudQBPY/+9/GkQ8Qk6WhlgyXLvOR9ZtXm3wLR0=",
    "iteracoes": 120000
  },
  {
    "nome": "Pablo R. S. J.",
    "salt": "zwBav9/BwVZcMY4S3oXoMA==",
    "hash": "wFQvmvfDn+toNNVpBNRCjdwEJ7x0Wj5R+RDEf7XlFxc=",
    "iteracoes": 120000
  },
  {
    "nome": "Pedro G. S. R.",
    "salt": "IdlnfYvbNej+dOWVeO4nRA==",
    "hash": "kV2YI3v21+LWkwRDJBbaDacx2RbkeBfBnfjuK6yQVhA=",
    "iteracoes": 120000
  },
  {
    "nome": "Pyetro H. S. R.",
    "salt": "52zDF/PlE8e8gqs8BIUpNg==",
    "hash": "y1UEKqLOEzaMk/N4FOkp/rE7qC81XbRrk1NPAy2I0Mg=",
    "iteracoes": 120000
  },
  {
    "nome": "Sophia A. C.",
    "salt": "TQ4jQjUNwoGSulvkisf2oA==",
    "hash": "K/P1ZuBdRWh/QQeJ8PB5ObVSy25cJBJk7bC1rOFk+HU=",
    "iteracoes": 120000
  },
  {
    "nome": "Sophia S. A. C.",
    "salt": "ijZa9fwj7I/MV8q73u2j1A==",
    "hash": "Gcb5gqqqCmW9PaBdWOi9BzN9H56nmSFVnHfsYVq9r3g=",
    "iteracoes": 120000
  },
  {
    "nome": "Thiago V. D.",
    "salt": "jrwL9qOkYRtiCdZNFoTmuw==",
    "hash": "PHQJnGoMC9oIHkOaS4N0fpwCVeBpCCyI2Ldt0mRI8Ng=",
    "iteracoes": 120000
  },
  {
    "nome": "Lisandro F. S. S.",
    "salt": "v6+O1phfxh6sSIC5nqzlvA==",
    "hash": "oMwk7rbcUC7VXsTpvizvRKeh8KeMkGjNuVOCKdjH1jg=",
    "iteracoes": 120000
  },
  {
    "nome": "Pedro H. S.",
    "salt": "Nf5Gv7YvAOztN0B3YQLjPg==",
    "hash": "EdqtvzizREwSrNtAa+Fk4nxrBsImssinIgpSw1hpRBA=",
    "iteracoes": 120000
  },
  {
    "nome": "Vitor E. S. N.",
    "salt": "1kZ+Eep9Z4uXzoRh+iCxxQ==",
    "hash": "NOI/HTmNgxDIWuu6BZ1/KCWmG7Kgc1C0fA4xpgczIJ0=",
    "iteracoes": 120000
  }
]
);
