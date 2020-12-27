import React from "react";
import {Languages} from "./I8n";

export const MainContext = React.createContext<{lang: Languages}>({lang: "en"});
