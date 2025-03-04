function sum(values: number[]): number {
	return values.reduce((acc, value) => acc + value, 0)
}

function isBetween(value: number, start: number, end: number): boolean {
	return value >= start && value <= end
}

export interface CalculationPayload {
	tag: string
	getNumOfItems: () => number
	getItemSize: (index: number) => number
	getScrollPosition: () => number
	getContainerSize: () => number
	getOverscanCount: () => number
}

export interface CalculationResult {
	offset: number
	renderedStartIndex: number
	renderedEndIndex: number
}

export const CalculationStep = {
	CALC_START: 0,
	CALC_END: 1,
} as const

export type CalculationStepType = typeof CalculationStep[keyof typeof CalculationStep]

export function calculate(payload: CalculationPayload): CalculationResult | null {
	const {
		getNumOfItems,
		getItemSize,
		getScrollPosition,
		getContainerSize,
		getOverscanCount,
	} = payload
	const containerSize = getContainerSize()

	if (containerSize <= 0)
		return null

	const containerStart = Math.max(0, getScrollPosition())
	const containerEnd = Math.max(0, containerStart + containerSize)
	const overscanCount = getOverscanCount()
	const numOfItems = getNumOfItems()

	let step: CalculationStepType = CalculationStep.CALC_START
	let current = 0
	let renderedStartIndex = 0
	let renderedEndIndex = 0

	for (let i = 0; i < numOfItems; i++) {
		const size = getItemSize(i)
		const itemStart = current
		const itemEnd = itemStart + size

		if (step === CalculationStep.CALC_START && isBetween(containerStart, itemStart, itemEnd)) {
			step = CalculationStep.CALC_END
			renderedStartIndex = i
			renderedEndIndex = i

			if (isBetween(containerEnd, itemStart, itemEnd)) {
				renderedEndIndex = i
				break
			}
		}
		else if (step === CalculationStep.CALC_END && isBetween(containerEnd, itemStart, itemEnd)) {
			renderedEndIndex = i
			break
		}

		current += size
	}

	renderedStartIndex = Math.max(0, renderedStartIndex - overscanCount)
	renderedEndIndex = Math.min(numOfItems - 1, renderedEndIndex + overscanCount)
	const offset = sum(Array.from({ length: renderedStartIndex }, (_, i) => getItemSize(i)))
	return {
		offset,
		renderedStartIndex,
		renderedEndIndex,
	}
}

export type ItemSizePixel = `${number}px`
export type ItemSizePercent = `${number}%`
export type ItemSizeFraction = `${number}fr`

export type AdvancedItemSize =
	| ItemSizePixel
	| ItemSizePercent
	| ItemSizeFraction
	| {
		value: ItemSizePixel | ItemSizePercent | ItemSizeFraction
		min?: ItemSizePixel | ItemSizePercent
		max?: ItemSizePixel | ItemSizePercent
	}

export interface ConvertSizeListPayload {
	getContainerSize: () => number
	getNumOfItems: () => number
	getAdvancedItemSize: (index: number) => AdvancedItemSize
}

export function convertSizeList(payload: ConvertSizeListPayload): number[] {
	const { getContainerSize, getNumOfItems, getAdvancedItemSize } = payload
	const containerSize = getContainerSize()
	const numOfItems = getNumOfItems()
	const sizeList: [value: number, min?: number, max?: number][] = []
	const frIndexes: number[] = []
	let nonFrTotal = 0
	let frTotal = 0

	for (let i = 0; i < numOfItems; i++) {
		const _size = getAdvancedItemSize(i)
		const size = typeof _size === 'object' ? _size : { value: _size, min: undefined, max: undefined }
		const value = Number.parseFloat(size.value)
		const min = size.min == null
			? undefined
			: size.min.endsWith('px')
				? Number.parseFloat(size.min)
				: size.min.endsWith('%')
					? Number.parseFloat(size.min) / 100 * containerSize
					: undefined
		const max = size.max == null
			? undefined
			: size.max.endsWith('px')
				? Number.parseFloat(size.max)
				: size.max.endsWith('%')
					? Number.parseFloat(size.max) / 100 * containerSize
					: undefined
		if (size.value.endsWith('px')) {
			nonFrTotal += value
			sizeList.push([value, min, max])
		}
		else if (size.value.endsWith('%')) {
			nonFrTotal += value / 100 * containerSize
			sizeList.push([value / 100 * containerSize, min, max])
		}
		else if (size.value.endsWith('fr')) {
			frIndexes.push(i)
			frTotal += value
			sizeList.push([value, min, max])
		}
	}

	const frSize = (containerSize - nonFrTotal) / frTotal
	for (const index of frIndexes) {
		sizeList[index]![0] = sizeList[index]![0] * frSize
	}

	return sizeList.map(([value, min, max]) => {
		if (min != null && value < min) {
			return min
		}
		if (max != null && value > max) {
			return max
		}
		return value
	})
}
