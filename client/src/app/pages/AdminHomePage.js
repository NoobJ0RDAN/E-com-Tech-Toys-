import AdminProductList from "../../features/admin/components/AdminProductList";
import Navbar from "../../features/navbar/Navbar";

function AdminHomePage() {
  return (
    <div>
      <Navbar>
        <AdminProductList></AdminProductList>
      </Navbar>
    </div>
  );
}

export default AdminHomePage;
