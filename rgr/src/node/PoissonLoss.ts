/**
 * PoissonLoss — simulates radio-channel packet loss using a Poisson process.
 *
 * The Poisson probability mass function gives the probability of observing
 * exactly k events (packet losses) in a fixed interval when the average rate
 * is λ:
 *
 *   P(k; λ) = (λ^k · e^{-λ}) / k!
 *
 * The probability that AT LEAST ONE loss occurs (i.e. the packet is dropped)
 * is the complement of P(0; λ):
 *
 *   P(drop) = 1 − P(0; λ) = 1 − e^{-λ}
 *
 * Example: λ = 0.3 → P(drop) ≈ 26 %
 */
export class PoissonLoss {
  private readonly lambda: number;

  constructor(lambda: number) {
    if (lambda < 0) throw new RangeError('lambda must be non-negative');
    this.lambda = lambda;
  }

  /**
   * Computes the Poisson PMF: P(k; λ).
   */
  pmf(k: number): number {
    if (k < 0 || !Number.isInteger(k)) return 0;
    return (Math.pow(this.lambda, k) * Math.exp(-this.lambda)) / this.factorial(k);
  }

  /**
   * Returns true if a packet should be dropped, based on P(drop) = 1 − e^{-λ}.
   */
  shouldDrop(): boolean {
    const dropProbability = 1 - Math.exp(-this.lambda);
    return Math.random() < dropProbability;
  }

  /**
   * Returns the current drop probability for informational logging.
   */
  dropProbability(): number {
    return 1 - Math.exp(-this.lambda);
  }

  private factorial(n: number): number {
    if (n <= 1) return 1;
    let result = 1;
    for (let i = 2; i <= n; i++) result *= i;
    return result;
  }
}
