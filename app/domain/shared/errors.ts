// Erros de domínio — representam regras de negócio violadas (esperados, não vão ao Sentry)
export class DomainError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'DomainError'
  }
}

export class CheckInAlreadyExistsError extends DomainError {
  constructor(date: string) {
    super(`Já existe um check-in para o dia ${date}. Apenas um check-in por dia é permitido.`)
    this.name = 'CheckInAlreadyExistsError'
  }
}

export class DigimonSlotFullError extends DomainError {
  constructor() {
    super('Limite de 3 Digimons atingido. Libere um slot antes de adotar outro.')
    this.name = 'DigimonSlotFullError'
  }
}

export class DigimonDeadError extends DomainError {
  constructor(name: string) {
    super(`${name} não está mais vivo e não pode ser cuidado.`)
    this.name = 'DigimonDeadError'
  }
}
