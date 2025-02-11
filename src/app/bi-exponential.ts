// 定义 双指数比例尺

export enum ScaleType {
    Linear = 0,
    Log,
    Biexponential,
    Band,
    UNKNOWN
  }

export class BiexponentialTranslator {
    _a: number;
    _b: number;
    _c: number;
    _d: number;
    _f: number;
    _x1: number;
    _W: number;
    _xTaylor: number;
    _taylor: number[];
    _bins: number = 1024;
    _lookup: number[];
    _rValue: number;
    _resolution: number;
    _T: number;

    _M: number = 4.5;
    LN_10: number = Math.log(10);
    _EPSILON: number = 1.0e-12;
    scale: ScaleType;

    // linear
    min: number = 0;
    max: number = 0;


    public get RValue() : number {
      return this._rValue;
    }

    constructor(rValue: number, linearMax: number) {
        this._rValue = rValue < 0 ? Math.abs(rValue) : 0.001;
        this._T = linearMax;

        this._W = (this._M - Math.log10(this._T / Math.abs(this._rValue))) / 2;

        // W should never be negative so clamp it at zero if it is negative
        if (this._W < 0) {
          this._W = 0.0;
        }

        let w: number = this._W / this._M;
        let x2: number = 0;
        this._x1 = x2 + w;
        let x0: number = x2 + 2 * w;
        this._b = this._M * this.LN_10;
        this._d = this.solve(this._b, w);
        let c_a: number = Math.exp(x0 * (this._b + this._d));
        let mf_a = Math.exp(this._b * this._x1) - c_a / Math.exp(this._d * this._x1);
        this._a = this._T / ((Math.exp(this._b) - mf_a) - c_a / Math.exp(this._d));
        this._c = c_a * this._a;
        this._f = -mf_a * this._a;

        // use Taylor series near x1, i.e., data zero to
        // avoid round off problems of formal definition
        this._xTaylor = this._x1 + w / 4;
        // compute coefficients of the Taylor series
        let posCoef: number = this._a * Math.exp(this._b * this._x1);
        let negCoef: number = -this._c / Math.exp(this._d * this._x1);
        // 16 is enough for full precision of typical scales
        this._taylor = new Array(16);
        for (let i = 0; i < this._taylor.length; ++i)
        {
            posCoef *= this._b / (i + 1);
            negCoef *= -this._d / (i + 1);
            this._taylor[i] = posCoef + negCoef;
        }
        this._taylor[1] = 0; // exact result of Logicle condition

        this._lookup = new Array(this._bins + 1);
        for (let i = 0; i <= this._bins; ++i)
        {
            let logicleValue: number = (i * 1.0) / this._bins;
            this._lookup[i] = this.inverse(logicleValue);
        }

        this._resolution = this._M / this._bins;

        this.scale = ScaleType.Biexponential;
        if (rValue < 0) {
          this.max = linearMax;
          this.min = this._lookup[0];
        }
    }

    // public override RangeDouble Range
    // {
    //     //get { return new RangeDouble() { Max = _M, Min = TranslateFromLinear(LinearRange.Min) }; }
    //     get { return new RangeDouble() { Max = _M, Min = 0 }; }
    // }

    translateFromLinear(linearValue: number): number {
        let scaledValue: number = 0;

        if (linearValue <= this._lookup[0])
        {
            scaledValue = 0;
        }
        else if (linearValue > this._lookup[this._bins - 1])
        {
            scaledValue = this._M;
        }
        else
        {
            // lookup the nearest value
            // let index: number = (this._lookup, linearValue);
            let index: number = -1;

            for (let i = 0; i < this._lookup.length - 1; i++) {
              if (linearValue >= this._lookup[i] && linearValue < this._lookup[i + 1]) {
                index = i;
                break;
              }
            }

            if (index == 0)
            {
                scaledValue = 0;
            }
            else
            {
                index = index < 0 ? ~index : index;
                if (index >= this._bins)
                {
                    scaledValue = this._M;
                }
                else
                {
                    if (index > 0)
                        scaledValue = ((linearValue - this._lookup[index - 1]) / (this._lookup[index] - this._lookup[index - 1]) + index - 1) * this._resolution;
                    else
                        scaledValue = this._lookup[0];
                }
            }
        }
        return scaledValue;
    }

    translateToLinear(scaledValue: number): number
    {
        // find the bin
        scaledValue = scaledValue < 0 ? 0 : scaledValue > 4.5 ? 4.5 : scaledValue;
        let x = scaledValue / this._resolution;
        let index = Math.floor(x);
        if (index < 0 || index > this._bins)
            throw new Error("Illegal argument to Logicle scale: " + scaledValue);

        // interpolate the table linearly
        let delta = x - index;

        return index < this._bins ? (1 - delta) * this._lookup[index] + delta * this._lookup[index + 1] : this._lookup[this._bins];
    }

    /**
     * Solve f(d;w,b) = 2 * (ln(d) - ln(b)) + w * (d + b) = 0 for d, given b and w
     *
     * @param b
     * @param w
     * @return double root d
     */
    solve(b: number, w: number): number {
        // w == 0 means its really arcsinh
        if (w == 0)
            return b;

        // based on RTSAFE from Numerical Recipes 1st Edition
        // bracket the root
        let d_lo: number = 0;
        let d_hi: number = b;

        // bisection first step
        let d: number = (d_lo + d_hi) / 2;
        let last_delta: number = d_hi - d_lo;
        let delta: number;

        // evaluate the f(d;w,b) = 2 * (ln(d) - ln(b)) + w * (b + d)
        // and its derivative
        let f_b: number = -2 * Math.log(b) + w * b;
        let f: number = 2 * Math.log(d) + w * d + f_b;
        let last_f: number = NaN;

        for (let i = 1; i < 20; ++i)
        {
            // compute the derivative
            let df: number = 2 / d + w;

            // if Newton's method would step outside the bracket
            // or if it isn't converging quickly enough
            if (((d - d_hi) * df - f) * ((d - d_lo) * df - f) >= 0
              || Math.abs(1.9 * f) > Math.abs(last_delta * df))
            {
                // take a bisection step
                delta = (d_hi - d_lo) / 2;
                d = d_lo + delta;
                if (d == d_lo)
                    return d; // nothing changed, we're done
            }
            else
            {
                // otherwise take a Newton's method step
                delta = f / df;
                let t: number = d;
                d -= delta;
                if (d == t)
                    return d; // nothing changed, we're done
            }
            // if we've reached the desired precision we're done
            if (Math.abs(delta) < this._EPSILON)
                return d;
            last_delta = delta;

            // recompute the function
            f = 2 * Math.log(d) + w * d + f_b;
            if (f == 0 || f == last_f)
                return d; // found the root or are not going to get any closer
            last_f = f;

            // update the bracketing interval
            if (f < 0)
                d_lo = d;
            else
                d_hi = d;
        }


        throw new Error("exceeded maximum iterations in solve()");
    }

    /**
     * Computes the value of Taylor series at a point on the scale
     *
     * @param scale
     * @return value of the biexponential function
     */
    seriesBiexponential(scale: number): number {
        // Taylor series is around x1
        let x = scale - this._x1;
        // note that taylor[1] should be identically zero according
        // to the Logicle condition so skip it here
        let sum = this._taylor[this._taylor.length - 1] * x;
        for (let i = this._taylor.length - 2; i >= 2; --i) {
          sum = (sum + this._taylor[i]) * x;
        }
        return (sum * x + this._taylor[0]) * x;
    }

    /**
     * Computes the data value corresponding to the given point of the Logicle
     * scale. This is the inverse of the {@link Logicle#scale(double) scale}
     * function.
     *
     * @param scale a double scale value
     * @return the double data value
     */
    inverse(scale: number): number {
        // reflect negative scale regions
        let negative: boolean = scale < this._x1;
        if (negative)
            scale = 2 * this._x1 - scale;

        // compute the biexponential
        let inverse: number;
        if (scale < this._xTaylor)
            // near x1, i.e., data zero use the series expansion
            inverse = this.seriesBiexponential(scale);
        else
            // this formulation has better roundoff behavior
            inverse = (this._a * Math.exp(this._b * scale) + this._f) - this._c / Math.exp(this._d * scale);

        // handle scale for negative values
        if (negative)
            return -inverse;
        else
            return inverse;
    }
}

const translators: Map<string, BiexponentialTranslator> = new Map();
export function constructBiExponentialTranslator(rValue: number, linearMax: number): BiexponentialTranslator {
  const key = `${rValue}_${linearMax}`;
  if (translators.has(key)) {
    return translators.get(key)!;
  }

  translators.set(key, new BiexponentialTranslator(rValue, linearMax));
  return translators.get(key)!;
}
