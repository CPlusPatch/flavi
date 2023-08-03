<script setup lang="ts">
const amountOfSubMessages = Math.ceil(Math.random() * 3);
</script>

<template>
	<div
		v-for="index in amountOfSubMessages"
		:key="index"
		:class="['mb-3 px-6', index === 1 && 'mt-3']">
		<div class="flex flex-row gap-2 w-full max-w-full">
			<div v-if="index > 1" class="w-10 shrink-0"></div>
			<div
				v-else
				class="h-10 bg-gray-500/40 animate-pulse duration-200 w-10 rounded-md shrink-0"></div>
			<div
				class="flex flex-col gap-3 text-sm grow overflow-hidden break-words">
				<div
					v-if="index === 1"
					:class="[
						'font-semibold h-4 w-40 bg-gray-500/40 rounded',
					]"></div>
				<div class="flex flex-col gap-3">
					<div
						v-for="x in Math.ceil(Math.random() * 2)"
						:key="x"
						class="text-gray-200 w-1/2 bg-gray-500/40 animate-pulse rounded h-5"
						:style="{
							width: `${Math.ceil(Math.random() * 20 + 40)}%`,
						}"></div>
				</div>
				<!-- <div class="max-w-sm rounded shadow overflow-hidden" v-if="event.isImage()">
					<img :src="media_url" />
				</div> -->
			</div>
			<div class="text-gray-300 text-xs">EEEEEEEEEEEE</div>
		</div>
	</div>
</template>
