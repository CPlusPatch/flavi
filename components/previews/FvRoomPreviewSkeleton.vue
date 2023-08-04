<template>
	<div class="flex flex-row gap-2 duration-200 p-2 rounded">
		<div
			class="h-8 w-8 relative rounded-full shrink-0 flex items-center justify-center shrink-0 shadow">
			<div
				class="w-full h-full object-cover rounded-full bg-gray-600 animate-pulse"></div>
		</div>
		<div
			class="flex flex-col h-full grow justify-around gap-1 text-sm overflow-hidden text-ellipsis">
			<h3
				class="m-0 line-clamp-1 text-ellipsis text-gray-100 font-semibold rounded animate-pulse bg-gray-600 h-4"
				:style="{
					width: `${Math.ceil(Math.random() * 20 + 40)}%`,
				}"></h3>
			<span
				class="text-gray-300 line-clamp-1 w-full bg-gray-600 animate-pulse h-4 rounded"
				:style="{
					width: `${Math.ceil(Math.random() * 20 + 60)}%`,
				}"></span>
		</div>
	</div>
</template>
