<script setup lang="ts">
import { CryptoEvent } from "matrix-js-sdk";
import { verificationMethods } from "matrix-js-sdk/lib/crypto";
import {
	ShowSasCallbacks,
	VerificationRequest,
	VerifierEvent,
} from "matrix-js-sdk/lib/crypto-api";

enum States {
	Hidden,
	Requesting,
	EmojiCheck,
}
const loading = ref(false);

const state = ref(States.Hidden);
const sas = ref<ShowSasCallbacks | null>(null);
const verificationRequest = ref<VerificationRequest | null>(null);

const store = useStore();

const acceptVerificationRequest = async () => {
	loading.value = true;
	await verificationRequest.value?.accept();
	const verifier = verificationRequest.value?.beginKeyVerification(
		verificationMethods.SAS
	);
	verifier?.once(VerifierEvent.ShowSas, sasData => {
		sas.value = sasData;
		state.value = States.EmojiCheck;
		loading.value = false;
	});

	verifier?.verify().finally(() => {
		state.value = States.Hidden;
		loading.value = false;
	});
};

const refuseVerificationRequest = async () => {
	loading.value = true;
	await verificationRequest.value?.cancel();
	state.value = States.Hidden;
	loading.value = false;
};

const validateSas = async () => {
	loading.value = true;
	if (!sas.value) {
		return;
	}
	await sas.value.confirm();
};

const refuseSas = async () => {
	loading.value = true;
	if (!sas.value) {
		return;
	}
	await sas.value.mismatch();
};

const verify = (request: VerificationRequest) => {
	if (request.otherUserId !== store.client?.getUserId()) {
		return;
	}
	if (state.value !== States.Hidden) {
		return;
	}

	verificationRequest.value = request;
	state.value = States.Requesting;
};

// Handle verification requests
store.client?.on(CryptoEvent.VerificationRequest, verify);

onUnmounted(() => {
	store.client?.off(CryptoEvent.VerificationRequest, verify);
});
</script>

<template>
	<HeadlessTransitionRoot as="template" :show="state != States.Hidden">
		<HeadlessDialog
			as="div"
			class="relative z-600"
			@close="state = States.Hidden">
			<HeadlessTransitionChild
				as="template"
				enter="ease-out duration-300"
				enter-from="opacity-0"
				enter-to="opacity-100"
				leave="ease-in duration-200"
				leave-from="opacity-100"
				leave-to="opacity-0">
				<div
					class="fixed inset-0 bg-dark-400 bg-opacity-75 transition-opacity" />
			</HeadlessTransitionChild>

			<div class="fixed inset-0 z-10 overflow-y-auto">
				<div
					class="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
					<HeadlessTransitionChild
						as="template"
						enter="ease-out duration-300"
						enter-from="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
						enter-to="opacity-100 translate-y-0 sm:scale-100"
						leave="ease-in duration-200"
						leave-from="opacity-100 translate-y-0 sm:scale-100"
						leave-to="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95">
						<HeadlessDialogPanel
							class="relative transform overflow-hidden rounded-lg ring-1 ring-accent-700 bg-dark-500 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg">
							<Transition
								enter-from-class="translate-x-full"
								enter-to-class="translate-x-0"
								enter-active-class="duration-100"
								leave-active-class="duration-100"
								leave-from-class="translate-x-0"
								leave-to-class="-translate-x-full"
								mode="out-in">
								<div v-if="state === States.Requesting">
									<div
										class="mt-3 text-center px-4 pb-4 pt-5 sm:p-6 sm:pb-4 sm:mt-0 sm:text-left">
										<HeadlessDialogTitle
											as="h3"
											class="text-base font-semibold leading-6 text-gray-50"
											>Incoming verification
											request</HeadlessDialogTitle
										>
										<div class="mt-2">
											<p class="text-sm text-gray-100">
												Device ID
												<strong class="font-semibold">{{
													verificationRequest?.otherDeviceId ??
													"UNKNOWN"
												}}</strong>
												has requested to verify via
												emoji.
											</p>
										</div>
									</div>
									<div
										class="bg-dark-400 px-4 py-3 gap-3 flex flex-col children:w-full sm:children:w-auto sm:flex-row-reverse sm:px-6">
										<ButtonFvButton
											theme="accent"
											:loading="loading"
											@click="acceptVerificationRequest">
											Accept
										</ButtonFvButton>
										<ButtonFvButton
											theme="accentLight"
											:loading="loading"
											@click="refuseVerificationRequest">
											Refuse
										</ButtonFvButton>
									</div>
								</div>
								<div v-else-if="state === States.EmojiCheck">
									<div
										class="mt-3 text-center px-4 pb-4 pt-5 sm:p-6 sm:pb-4 sm:mt-0 sm:text-left">
										<HeadlessDialogTitle
											as="h3"
											class="text-base font-semibold leading-6 text-gray-50"
											>Validate
											emojis</HeadlessDialogTitle
										>
										<div class="mt-2">
											<p class="text-sm text-gray-100">
												Your emojis are:
											</p>
											<div
												class="flex flex-row flex-wrap mt-4 gap-3 justify-center">
												<span
													v-for="emoji of sas?.sas
														.emoji"
													:key="emoji[1]"
													class="flex flex-col gap-2 text-sm text-gray-200 items-center"
													><Twemoji
														class="w-10 h-10"
														:emoji="emoji[0]" />{{
														emoji[1]
													}}</span
												>
											</div>
											<p
												class="text-sm text-gray-100 mt-6">
												Once you validate, please accept
												on your other device as well
											</p>
										</div>
									</div>
									<div
										class="bg-dark-400 px-4 py-3 gap-3 flex flex-col children:w-full sm:children:w-auto sm:flex-row-reverse sm:px-6">
										<ButtonFvButton
											theme="accent"
											:loading="loading"
											@click="validateSas">
											They match
										</ButtonFvButton>
										<ButtonFvButton
											theme="accentLight"
											:loading="loading"
											@click="refuseSas">
											They do not match
										</ButtonFvButton>
									</div>
								</div>
							</Transition>
						</HeadlessDialogPanel>
					</HeadlessTransitionChild>
				</div>
			</div>
		</HeadlessDialog>
	</HeadlessTransitionRoot>
</template>
