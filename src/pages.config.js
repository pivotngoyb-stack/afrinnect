import Home from './pages/Home';
import Matches from './pages/Matches';
import Chat from './pages/Chat';
import Events from './pages/Events';
import Profile from './pages/Profile';
import EditProfile from './pages/EditProfile';
import Premium from './pages/Premium';
import Report from './pages/Report';
import Settings from './pages/Settings';
import Onboarding from './pages/Onboarding';
import AdminDashboard from './pages/AdminDashboard';
import VerifyPhoto from './pages/VerifyPhoto';
import PricingPlans from './pages/PricingPlans';
import Analytics from './pages/Analytics';
import Landing from './pages/Landing';
import CustomerView from './pages/CustomerView';
import Terms from './pages/Terms';
import Privacy from './pages/Privacy';
import CommunityGuidelines from './pages/CommunityGuidelines';
import LegalAcceptance from './pages/LegalAcceptance';
import Notifications from './pages/Notifications';
import PhoneVerification from './pages/PhoneVerification';
import IDVerification from './pages/IDVerification';
import SafetyCheckSetup from './pages/SafetyCheckSetup';
import PanicButton from './pages/PanicButton';
import BoostProfile from './pages/BoostProfile';
import WhoLikesYou from './pages/WhoLikesYou';
import __Layout from './Layout.jsx';


export const PAGES = {
    "Home": Home,
    "Matches": Matches,
    "Chat": Chat,
    "Events": Events,
    "Profile": Profile,
    "EditProfile": EditProfile,
    "Premium": Premium,
    "Report": Report,
    "Settings": Settings,
    "Onboarding": Onboarding,
    "AdminDashboard": AdminDashboard,
    "VerifyPhoto": VerifyPhoto,
    "PricingPlans": PricingPlans,
    "Analytics": Analytics,
    "Landing": Landing,
    "CustomerView": CustomerView,
    "Terms": Terms,
    "Privacy": Privacy,
    "CommunityGuidelines": CommunityGuidelines,
    "LegalAcceptance": LegalAcceptance,
    "Notifications": Notifications,
    "PhoneVerification": PhoneVerification,
    "IDVerification": IDVerification,
    "SafetyCheckSetup": SafetyCheckSetup,
    "PanicButton": PanicButton,
    "BoostProfile": BoostProfile,
    "WhoLikesYou": WhoLikesYou,
}

export const pagesConfig = {
    mainPage: "Home",
    Pages: PAGES,
    Layout: __Layout,
};