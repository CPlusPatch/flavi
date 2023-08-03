<script setup lang="ts">
import { MatrixUser } from "~/classes/User";

const props = defineProps<{
	user: MatrixUser;
}>();

const presence = props.user.getPresenceStatus();
</script>
<template>
	<div
		class="flex flex-row gap-2 duration-200 hover:bg-dark-800 p-2 rounded items-center">
		<div
			class="h-8 w-8 relative rounded-full shrink-0 flex items-center justify-center shrink-0 shadow">
			<img
				:src="
					user.getAvatarUrl(96) ??
					`https://api.dicebear.com/6.x/initials/svg?seed=${user.getDisplayName()}&chars=1`
				"
				class="w-full h-full object-cover rounded-full" />
			<div
				class="absolute rounded-full p-1 -bottom-1 -right-1 bg-dark-800">
				<div
					v-if="presence === 'online'"
					class="bg-green-500 w-2 h-2 rounded-full"></div>
				<div v-else class="bg-gray-500 w-2 h-2 rounded-full"></div>
			</div>
		</div>
		<div
			class="flex flex-col h-full grow justify-around text-sm overflow-hidden text-ellipsis">
			<h3
				class="m-0 line-clamp-1 text-ellipsis text-gray-100 font-semibold"
				:title="user.getDisplayName() ?? ''">
				{{ user.getDisplayName() }}
			</h3>
			<span
				class="text-gray-300 line-clamp-1 text-xs"
				:title="user.getStatus() ?? user.getPresenceStatus()"
				>{{ user.getStatus() ?? user.getPresenceStatus() }}</span
			>
		</div>
	</div>
</template>
