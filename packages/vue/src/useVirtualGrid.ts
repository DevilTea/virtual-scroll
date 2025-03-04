import { type MaybeElementRef, unrefElement, useElementSize, useScroll } from '@vueuse/core'
import { computed, type CSSProperties, defineComponent, type DefineComponent, h, type MaybeRefOrGetter, ref, type Ref, toValue } from 'vue'
import { useVirtualListLogic, type UseVirtualListLogicPayload } from './useVirtualListLogic'

export interface UseVirtualGridPayload<T> {
	container: MaybeElementRef
	data: MaybeRefOrGetter<T[][]>
	columnWidth: UseVirtualListLogicPayload['itemSize']
	rowHeight: UseVirtualListLogicPayload['itemSize']
	overscanColumns?: UseVirtualListLogicPayload['overscan']
	overscanRows?: UseVirtualListLogicPayload['overscan']
}

export interface UseVirtualGridReturn<T> {
	VirtualGrid: VirtualGridComponent<T>
	renderedRowIndexes: Readonly<Ref<readonly number[]>>
	renderedColumnIndexes: Readonly<Ref<readonly number[]>>
}

interface SideVirtualGridBlockSlotProps {
	renderedRowIndexes: readonly number[]
	renderedColumnIndexes: readonly number[]
	mainGridTemplateColumns: string
	mainGridTemplateRows: string
	mainGridPaddingLeft: string
	mainGridPaddingTop: string
	getMainGridItemGridColumn: (columnIndex: number) => string
	getMainGridItemGridRow: (rowIndex: number) => string
}

interface CenterVirtualGridBlockSlotProps<T> {
	renderedRowIndexes: readonly number[]
	renderedColumnIndexes: readonly number[]
	data: T[][]
	mainGridStyle: CSSProperties
	getMainGridItemStyle: (rowIndex: number, columnIndex: number) => CSSProperties
}

// eslint-disable-next-line ts/no-empty-object-type
type VirtualGridComponent<T> = DefineComponent<{}> & {
	new(): {
		$slots: {
			// default: (slotProps: VirtualGridItemSlotProps) => any
			layoutLeftTop: () => any
			layoutTop: (slotProps: SideVirtualGridBlockSlotProps) => any
			layoutRightTop: () => any
			layoutLeft: (slotProps: SideVirtualGridBlockSlotProps) => any
			layoutCenter: (slotProps: CenterVirtualGridBlockSlotProps<T>) => any
			layoutRight: (slotProps: SideVirtualGridBlockSlotProps) => any
			layoutLeftBottom: () => any
			layoutBottom: (slotProps: SideVirtualGridBlockSlotProps) => any
			layoutRightBottom: () => any
		}
	}
}
const LayoutBlock = {
	col: ['Left', '', 'Right'],
	row: ['Top', '', 'Bottom'],
} as const

export function useVirtualGrid<T>(payload: UseVirtualGridPayload<T>): UseVirtualGridReturn<T> {
	const {
		width: containerWidth,
		height: containerHeight,
	} = useElementSize(payload.container)
	const leftTop: MaybeElementRef = ref()
	const leftTopSize = useElementSize(leftTop)
	const {
		x: _scrollLeft,
		y: _scrollTop,
	} = useScroll(() => unrefElement(payload.container))
	const scrollLeft = computed(() => _scrollLeft.value - leftTopSize.width.value)
	const scrollTop = computed(() => _scrollTop.value - leftTopSize.height.value)
	const numOfColumns = computed(() => toValue(payload.data)[0]?.length || 0)
	const numOfRows = computed(() => toValue(payload.data).length)
	const horizontal = useVirtualListLogic({
		tag: 'horizontal',
		containerSize: containerWidth,
		itemSize: payload.columnWidth,
		numOfItems: numOfColumns,
		scrollPosition: scrollLeft,
		overscan: payload.overscanColumns,
	})
	const vertical = useVirtualListLogic({
		tag: 'vertical',
		containerSize: containerHeight,
		itemSize: payload.rowHeight,
		numOfItems: numOfRows,
		scrollPosition: scrollTop,
		overscan: payload.overscanRows,
	})

	const mainGridTemplateColumns = computed(() => horizontal.renderedIndexes.value.map(index => `${horizontal.sizeList.value[index]!}px`).join(' '))
	const mainGridTemplateRows = computed(() => vertical.renderedIndexes.value.map(index => `${vertical.sizeList.value[index]!}px`).join(' '))
	const mainGridPaddingLeft = computed(() => `${horizontal.offset.value}px`)
	const mainGridPaddingTop = computed(() => `${vertical.offset.value}px`)
	const mainGridWidth = computed(() => `${horizontal.totalSize.value}px`)
	const mainGridHeight = computed(() => `${vertical.totalSize.value}px`)
	const mainGridStyle = computed(() => ({
		width: mainGridWidth.value,
		height: mainGridHeight.value,
		paddingLeft: mainGridPaddingLeft.value,
		paddingTop: mainGridPaddingTop.value,
		display: 'grid',
		gridTemplateColumns: mainGridTemplateColumns.value,
		gridTemplateRows: mainGridTemplateRows.value,
	} satisfies CSSProperties))
	function getMainGridItemGridColumn(columnIndex: number) {
		const c = columnIndex - horizontal.renderedStartIndex.value + 1
		return `${c} / ${c + 1}`
	}
	function getMainGridItemGridRow(rowIndex: number) {
		const r = rowIndex - vertical.renderedStartIndex.value + 1
		return `${r} / ${r + 1}`
	}
	function getMainGridItemStyle(rowIndex: number, columnIndex: number) {
		return {
			gridColumn: getMainGridItemGridColumn(columnIndex),
			gridRow: getMainGridItemGridRow(rowIndex),
		} satisfies CSSProperties
	}
	const VirtualGrid = defineComponent((_, { slots }) => {
		const layoutGridStyle = computed(() => ({
			display: 'grid',
			gridTemplateColumns: `auto ${mainGridWidth.value} auto`,
			gridTemplateRows: `auto ${mainGridHeight.value} auto`,
			minWidth: 'fit-content',
			minHeight: 'fit-content',
		} satisfies CSSProperties))
		return () => h('div', { style: layoutGridStyle.value }, [
			...Array.from({ length: 9 }, (_, i) => {
				const [c, r] = [i % 3, Math.floor(i / 3)]
				const isCenter = c === 1 && r === 1
				const isCorner = c !== 1 && r !== 1
				const isLeft = c === 0
				const isRight = c === 2
				const isTop = r === 0
				const isBottom = r === 2
				return h(
					'div',
					{
						...i === 0 ? { ref: leftTop } : {},
						style: {
							width: '100%',
							height: '100%',
							...isCenter === false ? { position: 'sticky' } : {},
							...isCorner ? { zIndex: 1 } : {},
							...isLeft ? { left: 0 } : isRight ? { right: 0 } : {},
							...isTop ? { top: 0 } : isBottom ? { bottom: 0 } : {},
							gridColumn: `${c + 1} / ${c + 2}`,
							gridRow: `${r + 1} / ${r + 2}`,
						} satisfies CSSProperties,
					},
					isCenter
						? slots.layoutCenter
							? slots.layoutCenter({
								data: toValue(payload.data),
								renderedRowIndexes: vertical.renderedIndexes.value,
								renderedColumnIndexes: horizontal.renderedIndexes.value,
								mainGridStyle: mainGridStyle.value,
								getMainGridItemStyle,
							} satisfies CenterVirtualGridBlockSlotProps<T>)
							: void 0
						: slots[`layout${LayoutBlock.col[c]}${LayoutBlock.row[r]}`]?.({
							renderedRowIndexes: vertical.renderedIndexes.value,
							renderedColumnIndexes: horizontal.renderedIndexes.value,
							mainGridTemplateColumns: mainGridTemplateColumns.value,
							mainGridTemplateRows: mainGridTemplateRows.value,
							mainGridPaddingLeft: mainGridPaddingLeft.value,
							mainGridPaddingTop: mainGridPaddingTop.value,
							getMainGridItemGridColumn,
							getMainGridItemGridRow,
						} satisfies SideVirtualGridBlockSlotProps),
				)
			}),
		])
	}) as any as VirtualGridComponent<T>

	return {
		renderedRowIndexes: vertical.renderedIndexes,
		renderedColumnIndexes: horizontal.renderedIndexes,
		VirtualGrid,
	}
}
