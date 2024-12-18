import React from "react";
import { Link } from "react-router-dom";
import { Fieldset, Form, Input, Label } from "../../components/Form";
import { Button } from "../../components/Button";
import { apiLogin } from "../../api/user";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../../store/auth";
import { setCanvasToken, setUserID } from "../../store/token";
import Popup from "react-popup";

export default function Login() {
	const navigate = useNavigate();
	const { setUserInfo } = useAuthStore();

	const handleSubmit = async (e) => {
		e.preventDefault();
		const formData = new FormData(e.target);
		const email = formData.get("email");
		const password = formData.get("password");

		const { status, data } = await apiLogin({ email, password });

		switch (status) {
			case 200:
				break;
			case 401:
				Popup.alert("Login failed. User not found.");
				return;
			default:
				Popup.alert("Login failed.", data);
				return;
		}
		setUserInfo(data.user);
		setCanvasToken(data.user.canvasToken);
		setUserID(data.user._id);

		navigate("/home");
	};

	return (
		<>
			<div className="flex min-h-screen items-center justify-center bg-gray-100">
				<div className="w-full max-w-md space-y-4 rounded-lg bg-white p-8 shadow-md">
					<h2 className="text-center text-2xl font-bold text-gray-700">
						Login
					</h2>
					<Form onSubmit={(e) => handleSubmit(e)}>
						<Fieldset>
							<Label>
								Email
								<Input
									type="email"
									name="email"
									required
									placeholder="Enter your email"
								/>
							</Label>
							<Label>
								Password
								<Input
									type="password"
									name="password"
									required
									placeholder="Enter your password"
								/>
							</Label>
							<Button className="mt-4 h-10" type="submit">
								Login
							</Button>
							<Link className="flex w-full" to="/create-account">
								<Button
									variant={"secondary"}
									className="mt-4 h-10 w-full"
									type="submit"
								>
									Create Account
								</Button>
							</Link>
						</Fieldset>
					</Form>
				</div>
			</div>
		</>
	);
}
