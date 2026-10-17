type IconProps = {
	className?: string;
};

export function CheckIcon({ className }: IconProps) {
	return (
		<img
			src="/assets/icon-check.svg"
			alt=""
			aria-hidden="true"
			className={className}
		/>
	);
}

export function AlertIcon({ className }: IconProps) {
	return (
		<img
			src="/assets/icon-alert.svg"
			alt=""
			aria-hidden="true"
			className={className}
		/>
	);
}

export function CloseIcon({ className }: IconProps) {
	return (
		<img
			src="/assets/icon-close.svg"
			alt=""
			aria-hidden="true"
			className={className}
		/>
	);
}

export function ArrowRightIcon({ className }: IconProps) {
	return (
		<img
			src="/assets/icon-arrow.svg"
			alt=""
			aria-hidden="true"
			className={className}
		/>
	);
}

export function SwapIcon({ className }: IconProps) {
	return (
		<img
			src="/assets/icon-swap.svg"
			alt=""
			aria-hidden="true"
			className={className}
		/>
	);
}
