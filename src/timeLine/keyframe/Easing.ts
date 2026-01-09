const Easing = Object.freeze({
	Linear: Object.freeze({
		None: function (amount: number) {
			return amount;
		},
	}),
	Quadratic: Object.freeze({
		In: function (amount: number) {
			return amount * amount;
		},
		Out: function (amount: number) {
			return amount * (2 - amount);
		},
		InOut: function (amount: number) {
			if ((amount *= 2) < 1) {
				return 0.5 * amount * amount;
			}
			return -0.5 * (--amount * (amount - 2) - 1);
		},
	}),
	Cubic: Object.freeze({
		In: function (amount: number) {
			return amount * amount * amount;
		},
		Out: function (amount: number) {
			return --amount * amount * amount + 1;
		},
		InOut: function (amount: number) {
			if ((amount *= 2) < 1) {
				return 0.5 * amount * amount * amount;
			}
			return 0.5 * ((amount -= 2) * amount * amount + 2);
		},
	}),
	Quartic: Object.freeze({
		In: function (amount: number) {
			return amount * amount * amount * amount;
		},
		Out: function (amount: number) {
			return 1 - --amount * amount * amount * amount;
		},
		InOut: function (amount: number) {
			if ((amount *= 2) < 1) {
				return 0.5 * amount * amount * amount * amount;
			}
			return -0.5 * ((amount -= 2) * amount * amount * amount - 2);
		},
	}),
	Quintic: Object.freeze({
		In: function (amount: number) {
			return amount * amount * amount * amount * amount;
		},
		Out: function (amount: number) {
			return --amount * amount * amount * amount * amount + 1;
		},
		InOut: function (amount: number) {
			if ((amount *= 2) < 1) {
				return 0.5 * amount * amount * amount * amount * amount;
			}
			return 0.5 * ((amount -= 2) * amount * amount * amount * amount + 2);
		},
	}),
	Sinusoidal: Object.freeze({
		In: function (amount: number) {
			return 1 - Math.sin(((1.0 - amount) * Math.PI) / 2);
		},
		Out: function (amount: number) {
			return Math.sin((amount * Math.PI) / 2);
		},
		InOut: function (amount: number) {
			return 0.5 * (1 - Math.sin(Math.PI * (0.5 - amount)));
		},
	}),
	Exponential: Object.freeze({
		In: function (amount: number) {
			return amount === 0 ? 0 : Math.pow(1024, amount - 1);
		},
		Out: function (amount: number) {
			return amount === 1 ? 1 : 1 - Math.pow(2, -10 * amount);
		},
		InOut: function (amount: number) {
			if (amount === 0) {
				return 0;
			}
			if (amount === 1) {
				return 1;
			}
			if ((amount *= 2) < 1) {
				return 0.5 * Math.pow(1024, amount - 1);
			}
			return 0.5 * (-Math.pow(2, -10 * (amount - 1)) + 2);
		},
	}),
	Circular: Object.freeze({
		In: function (amount: number) {
			return 1 - Math.sqrt(1 - amount * amount);
		},
		Out: function (amount: number) {
			return Math.sqrt(1 - --amount * amount);
		},
		InOut: function (amount: number) {
			if ((amount *= 2) < 1) {
				return -0.5 * (Math.sqrt(1 - amount * amount) - 1);
			}
			return 0.5 * (Math.sqrt(1 - (amount -= 2) * amount) + 1);
		},
	}),
	Elastic: Object.freeze({
		In: function (amount: number) {
			if (amount === 0) {
				return 0;
			}
			if (amount === 1) {
				return 1;
			}
			return -Math.pow(2, 10 * (amount - 1)) * Math.sin((amount - 1.1) * 5 * Math.PI);
		},
		Out: function (amount: number) {
			if (amount === 0) {
				return 0;
			}
			if (amount === 1) {
				return 1;
			}
			return Math.pow(2, -10 * amount) * Math.sin((amount - 0.1) * 5 * Math.PI) + 1;
		},
		InOut: function (amount: number) {
			if (amount === 0) {
				return 0;
			}
			if (amount === 1) {
				return 1;
			}
			amount *= 2;
			if (amount < 1) {
				return -0.5 * Math.pow(2, 10 * (amount - 1)) * Math.sin((amount - 1.1) * 5 * Math.PI);
			}
			return 0.5 * Math.pow(2, -10 * (amount - 1)) * Math.sin((amount - 1.1) * 5 * Math.PI) + 1;
		},
	}),
	Back: Object.freeze({
		In: function (amount: number) {
			var s = 1.70158;
			return amount === 1 ? 1 : amount * amount * ((s + 1) * amount - s);
		},
		Out: function (amount: number) {
			var s = 1.70158;
			return amount === 0 ? 0 : --amount * amount * ((s + 1) * amount + s) + 1;
		},
		InOut: function (amount: number) {
			var s = 1.70158 * 1.525;
			if ((amount *= 2) < 1) {
				return 0.5 * (amount * amount * ((s + 1) * amount - s));
			}
			return 0.5 * ((amount -= 2) * amount * ((s + 1) * amount + s) + 2);
		},
	}),
	Bounce: Object.freeze({
		In: function (amount: number) {
			return 1 - Easing.Bounce.Out(1 - amount);
		},
		Out: function (amount: number) {
			if (amount < 1 / 2.75) {
				return 7.5625 * amount * amount;
			}
			else if (amount < 2 / 2.75) {
				return 7.5625 * (amount -= 1.5 / 2.75) * amount + 0.75;
			}
			else if (amount < 2.5 / 2.75) {
				return 7.5625 * (amount -= 2.25 / 2.75) * amount + 0.9375;
			}
			else {
				return 7.5625 * (amount -= 2.625 / 2.75) * amount + 0.984375;
			}
		},
		InOut: function (amount: number) {
			if (amount < 0.5) {
				return Easing.Bounce.In(amount * 2) * 0.5;
			}
			return Easing.Bounce.Out(amount * 2 - 1) * 0.5 + 0.5;
		},
	})
});
export const EasingFunc: EasingFunction[] = [
	Easing.Linear.None,
	Easing.Quadratic.In,
	Easing.Quadratic.Out,
	Easing.Quadratic.InOut,
	Easing.Cubic.In,
	Easing.Cubic.Out,
	Easing.Cubic.InOut,
	Easing.Quartic.In,
	Easing.Quartic.Out,
	Easing.Quartic.InOut,
	Easing.Quintic.In,
	Easing.Quintic.Out,
	Easing.Quintic.InOut,
	Easing.Sinusoidal.In,
	Easing.Sinusoidal.Out,
	Easing.Sinusoidal.InOut,
	Easing.Exponential.In,
	Easing.Exponential.Out,
	Easing.Exponential.InOut,
	Easing.Circular.In,
	Easing.Circular.Out,
	Easing.Circular.InOut,
	Easing.Elastic.In,
	Easing.Elastic.Out,
	Easing.Elastic.InOut,
	Easing.Back.In,
	Easing.Back.Out,
	Easing.Back.InOut,
	Easing.Bounce.In,
	Easing.Bounce.Out,
	Easing.Bounce.InOut
];



type EasingFunction = (amount: number) => number;
type EasingType = {
	value: number,
	label: string,
	func?: EasingFunction;
};
type EasingTypeTree = {
	label: string,
	value: number,
	children: EasingType[];
};



export const EasingTree: EasingTypeTree[] = [
	{
		value: 0,
		label: 'Linear',
		children: [
			{ value: 0, label: 'None' }
		]
	},
	{
		value: 1,
		label: 'Quadratic',
		children: [
			{ value: 1, label: 'In' },
			{ value: 2, label: 'Out' },
			{ value: 3, label: 'InOut' }
		]
	},
	{
		value: 2,
		label: 'Cubic',
		children: [
			{ value: 4, label: 'In' },
			{ value: 5, label: 'Out' },
			{ value: 6, label: 'InOut' }
		]
	},
	{
		value: 3,
		label: 'Quartic',
		children: [
			{ value: 7, label: 'In' },
			{ value: 8, label: 'Out' },
			{ value: 9, label: 'InOut' }
		]
	},
	{
		value: 4,
		label: 'Quintic',
		children: [
			{ value: 10, label: 'In' },
			{ value: 11, label: 'Out' },
			{ value: 12, label: 'InOut' }
		]
	},
	{
		value: 5,
		label: 'Sinusoidal',
		children: [
			{ value: 13, label: 'In' },
			{ value: 14, label: 'Out' },
			{ value: 15, label: 'InOut' }
		]
	},
	{
		value: 6,
		label: 'Exponential',
		children: [
			{ value: 16, label: 'In' },
			{ value: 17, label: 'Out' },
			{ value: 18, label: 'InOut' }
		]
	},
	{
		value: 7,
		label: 'Circular',
		children: [
			{ value: 19, label: 'In' },
			{ value: 20, label: 'Out' },
			{ value: 21, label: 'InOut' }
		]
	},
	{
		value: 8,
		label: 'Elastic',
		children: [
			{ value: 22, label: 'In' },
			{ value: 23, label: 'Out' },
			{ value: 24, label: 'InOut' }
		]
	},
	{
		value: 9,
		label: 'Back',
		children: [
			{ value: 25, label: 'In' },
			{ value: 26, label: 'Out' },
			{ value: 27, label: 'InOut' }
		]
	},
	{
		value: 10,
		label: 'Bounce',
		children: [
			{ value: 28, label: 'In' },
			{ value: 29, label: 'Out' },
			{ value: 30, label: 'InOut' }
		]
	}
];