import { axiosCanvas } from ".";
import { getCanvasToken } from "../store/token";
import Popup from "react-popup";
import { setCanvasToken } from "../store/token";
import { apiPutUser } from "./user";
import {
	convertPlannerAssignments,
	convertSubmission,
} from "../utils/convertAssignments";

export async function getCanvasCourse() {
	try {
		const { status, data } = await axiosCanvas.get("courses");

		return { status, data };
	} catch (error) {
		console.log(
			"Error fetching Canvas course data:",
			error.response?.data || error.message,
		);
	}
}

export async function putMarkComplete({ id, complete }) {
	try {
		const { status, data } = await axiosCanvas.put(
			`planner/overrides/${id}`,
			{
				marked_complete: complete ? "true" : "false",
			},
		);

		return { status, data };
	} catch (error) {
		console.log(
			"Error fetching Canvas course data:",
			error.response?.data || error.message,
		);
	}
}

/* Get assignments from api */
export async function getAssignmentsTimeRange(option) {
	async function getAllAssignmentsRequest(start, end, allPages = true) {
		const initialURL = `planner/items?start_date=${start}${
			end ? "&end_date=" + end : ""
		}&per_page=1000`;
		return await getPaginatedRequest(initialURL, allPages);
	}
	try {
		if (!option || option === undefined) {
			option = "Semester";
		}

		const now = new Date();
		const options = {
			Day: {
				start: new Date(now),
				end: new Date(now),
			},
			Week: {
				start: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
				end: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
			},
			Month: {
				start: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
				end: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
			},
			Semester: {
				start: new Date("2024-08-23"),
				end: new Date("2024-12-19"),
			},
		};

		const st = options[option].start;
		st.setDate(st.getDate() - 1); // Adjust for time zones
		const en = options[option].end;
		en.setDate(en.getDate() + 1);

		const startStr = st.toISOString().split("T")[0];
		const endStr = en.toISOString().split("T")[0];

		const data = await getAllAssignmentsRequest(startStr, endStr);
		return { data: convertPlannerAssignments(data || []) };
	} catch (err) {
		console.error("Error in getAssignmentsTimeRange:", err.message);
		return { data: [] }; // Return empty data on error
	}
}

export async function getAllAssignmentsOfCourse(courses) {
	async function getAllAssignmentsRequest(course_id, allPages = true) {
		const initialURL = `/courses/${course_id}/assignments&per_page=1000`;
		return await getPaginatedRequest(
			initialURL,
			{ include: ["submission"] },
			allPages,
		);
	}
	try {
		const assignments = courses.map(async (course) => {
			return await getAllAssignmentsRequest(course.id);
		});

		return { data: convertSubmission(assignments.flatMap() || []) };
	} catch (err) {
		console.error("Error in getAssignmentsTimeRange:", err.message);
		return { data: [] }; // Return empty data on error
	}
}

export async function getCanvasUser() {
	try {
		const res = await axiosCanvas.get("users/self");
		return { status: res.status, data: res.data };
	} catch (error) {
		console.error(
			"Error fetching Canvas course data:",
			error.response?.data || error.message,
		);
	}
}

export async function validateToken(getCanvasInfo, save, cancel) {
	const attempt = async () => {
		try {
			const canvasToken = getCanvasToken();

			axiosCanvas.defaults.headers.common["Authorization"] =
				`Bearer ${canvasToken}`;
			const { data } = await getCanvasInfo();

			save(data);
		} catch (err) {
			Popup.plugins().canvasTokenPopup(
				async (token) => {
					console.log("New token entered:", token);
					setCanvasToken(token);
					Popup.close();
					await apiPutUser({ canvasToken: token });
					await attempt();
				},
				(value) => {
					console.log("Cancel clicked. Token value:", value);
					Popup.close();
					// cancel();
				},
			);
		}
	};
	await attempt();
}

const parseLinkHeader = (link) => {
	const re = /<([^>]+)>; rel="([^"]+)"/g;
	let arrRes;
	const ret = {};
	while ((arrRes = re.exec(link)) !== null) {
		ret[arrRes[2]] = {
			url: arrRes[1],
			page: arrRes[2],
		};
	}
	return ret;
};

export async function getPaginatedRequest(url, body = {}, recurse = false) {
	const results = [];
	try {
		let nextUrl = url;
		// console.log("Fetching paginated data from:", nextUrl);
		while (nextUrl) {
			console.log("Next URL:", nextUrl);
			const res = await axiosCanvas.get(nextUrl, body);
			results.push(...res.data);

			// Parse next URL from "link" header
			const links = parseLinkHeader(res.headers.link);
			nextUrl = links?.next?.url || null; // Stop if no "next" link
			if (nextUrl) {
				// Remove the base URL
				nextUrl = nextUrl.replace("https://canvas.vt.edu/api/v1/", "");
			}

			// console.log("Links:", links, nextUrl);
		}
	} catch (err) {
		console.error("Error during pagination:", err.message);
	}
	return results;
}
