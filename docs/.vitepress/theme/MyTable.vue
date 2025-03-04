<script setup lang="ts">
import { useVirtualGrid } from '@deviltea/virtual-scroll-vue'
import { ref } from 'vue'

const container = ref<HTMLElement | null>(null)
const { VirtualGrid } = useVirtualGrid<string>({
	container,
	columnWidth: '100px',
	rowHeight: '60px',
	data: Array.from({ length: 1000 }, (_, i) => Array.from({ length: 1000 }, (_, j) => `${i}-${j}`)),
})
</script>

<template>
	<div
		ref="container"
		style="width: 100%; height: 75vh; overflow: auto;"
	>
		<VirtualGrid>
			<template #layoutTop="{ mainGridPaddingLeft, mainGridTemplateColumns, renderedColumnIndexes }">
				<div
					style="width: 100%; height: 100%;"
					:style="{
						paddingLeft: mainGridPaddingLeft,
						display: 'grid',
						gridTemplateColumns: mainGridTemplateColumns,
					}"
				>
					<template
						v-for="columnIndex in renderedColumnIndexes"
						:key="`column-${columnIndex}`"
					>
						<div style="width: 100%; height: 100%; padding: 8px 0; display: flex; justify-content: center; align-items: center; background-color: black; color: white;">
							Col - {{ columnIndex }}
						</div>
					</template>
				</div>
			</template>
			<template #layoutCenter="{ mainGridStyle, renderedRowIndexes, renderedColumnIndexes, data }">
				<div :style="mainGridStyle">
					<template
						v-for="rowIndex in renderedRowIndexes"
						:key="`row-${rowIndex}`"
					>
						<template
							v-for="columnIndex in renderedColumnIndexes"
							:key="`column-${columnIndex}`"
						>
							<div style="width: 100%; height: 100%; display: flex; justify-content: center; align-items: center;">
								{{ data[rowIndex]![columnIndex] }}
							</div>
						</template>
					</template>
				</div>
			</template>
		</VirtualGrid>
	</div>
</template>
