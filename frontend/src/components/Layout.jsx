import Sidebar from './Sidebar';
import '../css/Layout.css';

function Layout({ children }) {
  return (
    <div className="app-layout">
      <Sidebar />
      <main className="content-wrap">{children}</main>
    </div>
  );
}

export default Layout;
