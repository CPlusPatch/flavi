<script setup lang="ts">
import { createClient } from "matrix-js-sdk";
import {
	IIdentityProvider,
	ILoginFlow,
	SSOAction,
} from "matrix-js-sdk/lib/@types/auth";

const loading = ref(false);

const error = ref<string | null>(null);
const showingPassword = ref(false);

const userId = useLocalStorage("userId", "");
const users = useLocalStorage<
	{
		id: string;
		avatar: string;
		name: string;
		accessToken: string;
		baseUrl: string;
		deviceId: string;
	}[]
>("users", []);

enum FlowStage {
	Homeserver,
	Login,
}

const flowStage = ref<FlowStage>(FlowStage.Homeserver);
const homeserverData = ref<{
	baseUrl: string;
	normalUrl: string;
} | null>(null);
const flows = ref<ILoginFlow[] | null>(null);
const isPassword = computed(
	() => flows.value?.find(flow => flow.type === "m.login.password")
);
const ssoProviders = computed(
	() =>
		(
			flows.value?.filter(flow => flow.type === "m.login.sso")[0] ??
			({} as any)
		).identity_providers as IIdentityProvider[] | null
);

const submit = async (e: Event) => {
	loading.value = true;

	if (flowStage.value === FlowStage.Homeserver) {
		// If flow stage is homeserver, validate URL and get homeserver info
		let homeserver: string = (e.target as any).homeserver.value;

		if (!homeserver) {
			error.value = "Please enter a homeserver URL";
			loading.value = false;
			return;
		}

		// Add https:// if it isnt present
		if (!homeserver.startsWith("https://")) {
			homeserver = `https://${homeserver}`;
		}

		// Validate URL
		try {
			// eslint-disable-next-line no-new
			new URL(homeserver);
		} catch (e) {
			error.value = "Please enter a valid URL";
			loading.value = false;
			return;
		}

		// Get homeserver non-delegated URL
		let baseUrl;
		try {
			const response = await fetch(
				`${homeserver}/.well-known/matrix/client`
			);

			baseUrl = (await response.json())["m.homeserver"].base_url;
		} catch {
			error.value = "Couldn't get homeserver URL";
			loading.value = false;
			return;
		}

		if (!baseUrl) {
			error.value = "Couldn't get homeserver URL";
			loading.value = false;
			return;
		}

		homeserverData.value = {
			baseUrl,
			normalUrl: homeserver,
		};

		flowStage.value = FlowStage.Login;

		const client = createClient({
			baseUrl: homeserverData.value?.baseUrl,
		});

		flows.value = (await client.loginFlows()).flows;
		error.value = null;
		loading.value = false;
	} else if (flowStage.value === FlowStage.Login) {
		if (!homeserverData.value) return;

		const username: string = (e.target as any).username.value;
		const password: string = (e.target as any).password.value;

		const client = createClient({
			baseUrl: homeserverData.value?.baseUrl,
		});

		let session;
		try {
			session = await client.login("m.login.password", {
				identifier: {
					type: "m.id.user",
					user: username,
				},
				password,
				initial_device_display_name: "Flavi Web",
			});
		} catch {
			error.value = "Invalid username or password";
			loading.value = false;
			return;
		}

		users.value.push({
			id: session.user_id,
			avatar: "",
			name: session.user_id,
			accessToken: session.access_token,
			baseUrl: client.baseUrl,
			deviceId: session.device_id,
		});
		userId.value = session.user_id;

		loading.value = false;
	}
};

const loginWithSso = (provider: IIdentityProvider) => {
	const client = createClient({
		baseUrl: homeserverData.value?.baseUrl ?? "",
	});

	let url;
	try {
		url = client.getSsoLoginUrl(
			`${window.location.origin}/auth/redirect`,
			"sso",
			provider.id,
			SSOAction.LOGIN
		);
	} catch {
		error.value = "Invalid username or password";
		loading.value = false;
		return;
	}

	localStorage.setItem("homeserver", client.baseUrl);

	window.location.replace(url);
};
</script>

<template>
	<div
		class="flex min-h-screen w-full flex-1 flex-col justify-center px-6 py-12 lg:px-8 bg-accent-900">
		<div class="sm:mx-auto sm:w-full sm:max-w-sm">
			<h2
				class="mt-10 text-center text-2xl font-bold leading-9 tracking-tight text-gray-50">
				Sign in to your account
			</h2>
		</div>

		<div class="mt-10 sm:mx-auto sm:w-full sm:max-w-sm">
			<form
				class="space-y-4"
				action="#"
				method="POST"
				@submit.prevent="submit">
				<div v-if="flowStage === FlowStage.Homeserver">
					<label
						for="email"
						class="block text-sm font-medium leading-6 text-gray-50"
						>Homeserver URL</label
					>
					<div class="mt-2">
						<InputFvInput
							icon="ic:round-perm-identity"
							name="homeserver"
							placeholder="Homeserver URL"
							required
							class="block w-full rounded-md"
							:loading="loading" />
					</div>
				</div>

				<div v-if="flowStage === FlowStage.Login && isPassword">
					<label
						for="email"
						class="block text-sm font-medium leading-6 text-gray-50"
						>Username</label
					>
					<div class="mt-2">
						<InputFvInput
							icon="ic:round-perm-identity"
							name="username"
							placeholder="Your username"
							autocomplete="username"
							required
							class="block w-full rounded-md"
							:loading="loading" />
					</div>
				</div>

				<div v-if="flowStage === FlowStage.Login && isPassword">
					<div class="flex items-center justify-between">
						<label
							for="password"
							class="block text-sm font-medium leading-6 text-gray-50"
							>Password</label
						>
						<div class="text-sm">
							<a
								href="#"
								class="font-semibold text-accent-300 hover:text-accent-400"
								@click="showingPassword = !showingPassword"
								>{{ showingPassword ? "Hide" : "Show" }}</a
							>
						</div>
					</div>
					<div class="mt-2">
						<InputFvInput
							name="password"
							:type="showingPassword ? 'text' : 'password'"
							icon="ic:round-password"
							autocomplete="current-password"
							placeholder="Your password"
							required
							:loading="loading"
							class="block w-full rounded-md !ring-accent-500 !border-gray-600" />
					</div>
				</div>

				<div
					v-if="error"
					class="rounded bg-red-700 ring-1 ring-red-600 p-4 text-sm flex flex-col gap-2">
					<strong class="font-semibold text-gray-50"
						>An error occured</strong
					>
					<span class="text-gray-200">{{ error }}</span>
				</div>

				<div class="mt-4">
					<ButtonFvButton
						:loading="loading"
						type="submit"
						theme="accent"
						class="flex w-full">
						{{ flowStage === FlowStage.Login ? "Sign in" : "Next" }}
					</ButtonFvButton>
				</div>
				<div
					v-if="
						flowStage === FlowStage.Login &&
						(ssoProviders?.length ?? 0) > 0
					"
					class="relative flex flex-row justify-center items-center text-sm">
					<div class="h-0.5 bg-gray-700 w-1/4 rounded"></div>
					<span class="px-2 text-gray-400 w-1/2 text-center">
						Login with
					</span>
					<div class="h-0.5 bg-gray-700 w-1/4 rounded"></div>
				</div>
				<div class="grid grid-cols-2 w-full gap-2">
					<ButtonFvButton
						v-for="provider of ssoProviders"
						:key="provider.id"
						theme="gray"
						@click="loginWithSso(provider)"
						><img
							:src="
								createClient({
									baseUrl: homeserverData?.baseUrl ?? '',
								}).mxcUrlToHttp(provider.icon ?? '') ?? ''
							"
							class="mr-1.5 w-4 h-4 rounded-sm" />{{
							provider.name
						}}</ButtonFvButton
					>
				</div>
			</form>
		</div>
	</div>
</template>
