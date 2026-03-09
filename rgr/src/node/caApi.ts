export type CertificateIssuedResponse = {
  type: 'CERTIFICATE_ISSUED'
  nodeId: string
  certificate: string
  key: string
  caCertificate: string
  message: string
}

export type CertificateIssueError = {
  error: string
}

export type CertificateValidateResponse = {
  nodeId: string
  valid: boolean
  issuedAt?: string
  reason?: string
}

export type CertificateValidateError = {
  error: string
}

export class CAApi {
  constructor(private caUrl: string) {
  }

  async issueCertificate(nodeId: string): Promise<CertificateIssuedResponse> {
    const res = await fetch(`${this.caUrl}/api/certificates/issue`, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({nodeId})
    })
    if (!res.ok) {
      const err: CertificateIssueError = await res.json()
      throw new Error(err.error)
    }
    return res.json()
  }

  async validateCertificate(certificate: string): Promise<CertificateValidateResponse> {
    const res = await fetch(`${this.caUrl}/api/certificates/validate`, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({certificate})  // ✅ Надсилаємо сам сертифікат
    })
    if (!res.ok) {
      const err: CertificateValidateError = await res.json()
      throw new Error(err.error)
    }
    return res.json()
  }
}
