import { type AdvancedItemSize, calculate, convertSizeList } from '@deviltea/virtual-scroll-core'
import { computed, type MaybeRefOrGetter, readonly, type Ref, toValue } from 'vue'

export interface UseVirtualListLogicPayload {
	tag: string
	numOfItems: MaybeRefOrGetter<number>
	itemSize: MaybeRefOrGetter<AdvancedItemSize> | ((index: number) => AdvancedItemSize)
	scrollPosition: MaybeRefOrGetter<number>
	containerSize: MaybeRefOrGetter<number>
	overscan?: MaybeRefOrGetter<number>
}

export interface UseVirtualListLogicReturn {
	sizeList: Readonly<Ref<readonly number[]>>
	totalSize: Readonly<Ref<number>>
	renderedStartIndex: Readonly<Ref<number>>
	renderedEndIndex: Readonly<Ref<number>>
	renderedIndexes: Readonly<Ref<readonly number[]>>
	offset: Readonly<Ref<number>>
	getItemPosition: (index: number) => number
}

const OVERSCAN_DEFAULT = 5

export function useVirtualListLogic(payload: UseVirtualListLogicPayload): UseVirtualListLogicReturn {
	const getNumOfItems = () => toValue(payload.numOfItems)
	const getScrollPosition = () => toValue(payload.scrollPosition)
	const getContainerSize = () => toValue(payload.containerSize)
	const overscanCount = computed(() => payload.overscan == null ? OVERSCAN_DEFAULT : toValue(payload.overscan))
	const getOverscanCount = () => overscanCount.value
	const getAdvancedItemSize = (index: number): AdvancedItemSize => typeof payload.itemSize === 'function' ? payload.itemSize(index) : toValue(payload.itemSize)
	const sizeList = readonly(computed(() => convertSizeList({ getContainerSize, getNumOfItems, getAdvancedItemSize })))
	const getItemSize = (index: number) => sizeList.value[index]!
	const totalSize = readonly(computed(() => {
		let totalSize = 0
		for (const size of sizeList.value) {
			totalSize += size
		}
		return totalSize
	}))
	const visibleRange = computed(() => calculate({ tag: payload.tag, getNumOfItems, getItemSize, getScrollPosition, getContainerSize, getOverscanCount }))
	const renderedStartIndex = readonly(computed(() => visibleRange.value?.renderedStartIndex || 0))
	const renderedEndIndex = readonly(computed(() => visibleRange.value?.renderedEndIndex || 0))
	const renderedIndexes = computed(() => visibleRange.value == null
		? []
		: Array.from({ length: renderedEndIndex.value - renderedStartIndex.value + 1 }, (_, index) => index + renderedStartIndex.value))
	const offset = readonly(computed(() => visibleRange.value?.offset || 0))
	const getItemPosition = (index: number) => {
		let position = 0
		for (const size of sizeList.value.slice(0, index)) {
			position += size
		}
		return position
	}

	return {
		sizeList,
		totalSize,
		renderedStartIndex,
		renderedEndIndex,
		renderedIndexes,
		offset,
		getItemPosition,
	}
}
