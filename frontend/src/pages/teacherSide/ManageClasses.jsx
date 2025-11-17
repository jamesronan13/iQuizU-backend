import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Upload, Loader2, CircleCheck, AlertCircle } from "lucide-react";
import Papa from "papaparse";
import * as XLSX from "xlsx";
import { auth, db } from "../../firebase/firebaseConfig";
import { collection, addDoc, query, where, getDocs, doc, updateDoc } from "firebase/firestore";
import ClassNameModal from './ClassNameModal';

export default function ManageClasses() {
  const [fileName, setFileName] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadCount, setUploadCount] = useState(0);
  const [errorMessage, setErrorMessage] = useState("");
  const [uploadProgress, setUploadProgress] = useState("");
  const [showClassNameModal, setShowClassNameModal] = useState(false);
  const [pendingUploadData, setPendingUploadData] = useState(null);
  const [classCount, setClassCount] = useState(0);
  const [isLimitReached, setIsLimitReached] = useState(false);
  const navigate = useNavigate();
  
  const authRef = useRef(null);
  const MAX_CLASSES = 8;

  // Check class count on component mount
  useEffect(() => {
    checkClassLimit();
  }, []);

  const checkClassLimit = async () => {
    const user = auth.currentUser;
    if (!user) return;

    try {
      const q = query(
        collection(db, "classes"),
        where("teacherId", "==", user.uid)
      );
      const querySnapshot = await getDocs(q);
      const count = querySnapshot.size;
      
      setClassCount(count);
      setIsLimitReached(count >= MAX_CLASSES);
      
      console.log(`Teacher has ${count}/${MAX_CLASSES} classes`);
    } catch (error) {
      console.error("Error checking class limit:", error);
    }
  };

  const checkStudentExistsByEmail = async (emailAddress) => {
    if (!emailAddress || emailAddress.trim() === "") {
      return null;
    }

    try {
      const q = query(
        collection(db, "users"),
        where("emailAddress", "==", emailAddress.toLowerCase().trim())
      );
      
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        const existingDoc = querySnapshot.docs[0];
        return {
          id: existingDoc.id,
          name: existingDoc.data().name,
          classIds: existingDoc.data().classIds || [],
          hasAccount: existingDoc.data().hasAccount,
          authUID: existingDoc.data().authUID
        };
      }
      
      return null;
    } catch (error) {
      console.error("Error checking student by email:", error);
      return null;
    }
  };

  const normalizeHeaders = (data) => {
    return data.map(row => {
      const normalized = {};
      Object.keys(row).forEach(key => {
        const trimmedKey = key.trim().replace(/\s+/g, ' ');
        const lowerKey = trimmedKey.toLowerCase();
        
        if (lowerKey === "no" || lowerKey === "no.") {
          normalized["No"] = row[key];
        } else if (lowerKey === "student no." || lowerKey === "student no" || lowerKey === "student number") {
          normalized["Student No."] = row[key];
        } else if (lowerKey === "name") {
          normalized["Name"] = row[key];
        } else if (lowerKey === "gender") {
          normalized["Gender"] = row[key];
        } else if (lowerKey === "program") {
          normalized["Program"] = row[key];
        } else if (lowerKey === "year") {
          normalized["Year"] = row[key];
        } else if (lowerKey === "email address" || lowerKey === "email") {
          normalized["Email Address"] = row[key];
        } else if (lowerKey === "contact no." || lowerKey === "contact no" || lowerKey === "contact number") {
          normalized["Contact No."] = row[key];
        } else {
          normalized[trimmedKey] = row[key];
        }
      });
      return normalized;
    });
  };

  const processStudentData = async (students, headers, file) => {
    console.log("Parsed data:", students);
    console.log("Total rows:", students.length);
    console.log("First row:", students[0]);
    console.log("Headers:", headers);
    
    const user = auth.currentUser;
    if (!user) {
      alert("❌ Please log in first!");
      return;
    }

    // Check class limit before processing
    if (isLimitReached) {
      alert(`❌ Class Limit Reached!\n\nYou have reached the maximum limit of ${MAX_CLASSES} classes.\n\nPlease delete an existing class before adding a new one.`);
      return;
    }

    const normalizedStudents = normalizeHeaders(students);
    console.log("Normalized first row:", normalizedStudents[0]);

    const requiredHeaders = ["Student No.", "Name"];
    const firstRow = normalizedStudents[0] || {};
    const availableHeaders = Object.keys(firstRow);
    
    console.log("Available headers:", availableHeaders);
    console.log("Required headers:", requiredHeaders);
    
    const missingHeaders = requiredHeaders.filter(h => !availableHeaders.includes(h));
    
    if (missingHeaders.length > 0) {
      alert(`❌ Missing columns: ${missingHeaders.join(", ")}\n\nAvailable columns: ${availableHeaders.join(", ")}\n\nPlease check your file format.`);
      return;
    }

    const validStudents = normalizedStudents.filter(s => 
      s["Student No."] && s["Name"]
    );

    if (validStudents.length === 0) {
      alert("❌ No valid student data found in file");
      return;
    }

    console.log("Valid students:", validStudents.length);

    setPendingUploadData({
      validStudents,
      file
    });
    setShowClassNameModal(true);
  };

  const confirmClassNameAndUpload = async (className) => {
    setShowClassNameModal(false);
    setUploading(true);
    setUploadProgress("Starting upload...");

    try {
      const user = auth.currentUser;
      if (!user) {
        alert("❌ Please log in first!");
        return;
      }

      // Double-check class limit before upload
      if (isLimitReached) {
        alert(`❌ Class Limit Reached!\n\nYou have reached the maximum limit of ${MAX_CLASSES} classes.`);
        setUploading(false);
        setUploadProgress("");
        return;
      }

      const { validStudents, file } = pendingUploadData;
      const teacherName = user.displayName || user.email?.split('@')[0] || "Teacher";
      
      setUploadProgress(`Creating class: ${className}`);
      
      const classDoc = await addDoc(collection(db, "classes"), {
        name: className,
        subject: "",
        studentCount: validStudents.length,
        teacherId: user.uid,
        teacherEmail: user.email,
        teacherName: teacherName,
        uploadedAt: new Date(),
        fileName: file.name
      });

      console.log(`Created class document: ${classDoc.id}`);

      let newStudentCount = 0;
      let addedToExistingCount = 0;
      let errorCount = 0;

      for (let i = 0; i < validStudents.length; i++) {
        try {
          const student = validStudents[i];
          setUploadProgress(`Processing student ${i + 1}/${validStudents.length}`);

          const {
            "No": no,
            "Student No.": studentNo,
            "Name": name,
            "Gender": gender,
            "Program": program,
            "Year": year,
            "Email Address": emailAddress,
            "Contact No.": contactNo
          } = student;

          if (!studentNo || !name) {
            console.error("Missing required fields:", student);
            errorCount++;
            continue;
          }

          const cleanStudentNo = studentNo.toString().trim();
          const cleanEmail = emailAddress?.toString().trim().toLowerCase() || "";

          const existingStudent = await checkStudentExistsByEmail(cleanEmail);

          if (existingStudent) {
            const updatedClassIds = [...new Set([...existingStudent.classIds, classDoc.id])];
            
            await updateDoc(doc(db, "users", existingStudent.id), {
              classIds: updatedClassIds
            });
            
            addedToExistingCount++;
            console.log(`✅ Added ${name} to class ${className} (already exists)`);
          } else {
            await addDoc(collection(db, "users"), {
              studentNo: cleanStudentNo,
              name: name.toString().trim(),
              gender: gender?.toString().trim() || "",
              program: program?.toString().trim() || "",
              year: year?.toString().trim() || "",
              emailAddress: cleanEmail,
              contactNo: contactNo?.toString().trim() || "",
              classIds: [classDoc.id],
              role: "student",
              hasAccount: false,
              authUID: null,
              createdAt: new Date()
            });
            
            newStudentCount++;
            console.log(`✅ New student created: ${name}`);
          }
        } catch (studentError) {
          console.error("Error processing student:", validStudents[i], studentError);
          errorCount++;
        }
      }

      const totalCount = newStudentCount + addedToExistingCount;
      setUploadCount(totalCount);

      if (totalCount > 0) {
        let message = `✅ Upload Complete!\n\n`;
        message += `✨ New students: ${newStudentCount}\n`;
        message += `🔗 Added to existing: ${addedToExistingCount}\n`;
        
        if (errorCount > 0) {
          message += `❌ Errors: ${errorCount}`;
        }
        
        alert(message);
        
        // Update class count
        await checkClassLimit();
        
        // Trigger real-time update
        console.log("📢 Dispatching classesUpdated event...");
        window.dispatchEvent(new Event('classesUpdated'));
        
        // Navigate to new class
        setTimeout(() => {
          navigate(`/teacher/class/${classDoc.id}`);
        }, 500);
      } else {
        throw new Error("No students were uploaded successfully");
      }

      setFileName("");
      setUploadProgress("");
      setPendingUploadData(null);

      // Trigger sidebar refresh
      window.dispatchEvent(new Event('classesUpdated'));
    } catch (error) {
      console.error("Error saving to Firestore:", error);
      setErrorMessage(error.message);
      alert("❌ Failed to upload data: " + error.message);
    } finally {
      setUploading(false);
      setUploadProgress("");
    }
  };

  const cancelClassNameModal = () => {
    setShowClassNameModal(false);
    setPendingUploadData(null);
    setFileName("");
  };

  const handleFileUpload = (e) => {
    if (isLimitReached) {
      alert(`❌ Class Limit Reached!\n\nYou have reached the maximum limit of ${MAX_CLASSES} classes.\n\nPlease delete an existing class before adding a new one.`);
      e.target.value = "";
      return;
    }

    const file = e.target.files[0];
    if (!file) return;
    
    setFileName(file.name);
    setErrorMessage("");
    setUploadCount(0);

    const fileExtension = file.name.split('.').pop().toLowerCase();

    if (fileExtension === 'csv') {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        dynamicTyping: false,
        transformHeader: (header) => header.trim(),
        complete: async function (results) {
          await processStudentData(results.data, results.meta.fields || [], file);
          e.target.value = "";
        },
        error: function(error) {
          console.error("CSV parsing error:", error);
          setErrorMessage("Failed to parse CSV file: " + error.message);
          alert("❌ Failed to parse CSV file. Please check the file format.");
        }
      });
    } else if (fileExtension === 'xlsx' || fileExtension === 'xls') {
      const reader = new FileReader();
      
      reader.onload = async (event) => {
        try {
          const data = new Uint8Array(event.target.result);
          const workbook = XLSX.read(data, { type: 'array' });
          
          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];
          
          const allData = XLSX.utils.sheet_to_json(worksheet, { 
            header: 1,
            raw: false,
            defval: ""
          });
          
          console.log("First 15 rows:", allData.slice(0, 15));
          
          let headerRowIndex = -1;
          for (let i = 0; i < allData.length; i++) {
            const row = allData[i];
            const rowStr = row.join('|').toLowerCase();
            if (rowStr.includes('student no') || (rowStr.includes('no') && rowStr.includes('name'))) {
              headerRowIndex = i;
              console.log("Found header row at index:", i, "Row:", row);
              break;
            }
          }
          
          if (headerRowIndex === -1) {
            throw new Error("Could not find header row with 'Student No.' and 'Name' columns");
          }
          
          const range = XLSX.utils.decode_range(worksheet['!ref']);
          range.s.r = headerRowIndex;
          const newRange = XLSX.utils.encode_range(range);
          
          const jsonData = XLSX.utils.sheet_to_json(worksheet, { 
            raw: false,
            defval: "",
            range: newRange
          });
          
          console.log("Parsed data from header row:", jsonData.slice(0, 3));
          
          const headers = Object.keys(jsonData[0] || {});
          
          await processStudentData(jsonData, headers, file);
          e.target.value = "";
        } catch (error) {
          console.error("XLSX parsing error:", error);
          setErrorMessage("Failed to parse Excel file: " + error.message);
          alert("❌ Failed to parse Excel file. Please check the file format.");
        }
      };
      
      reader.onerror = (error) => {
        console.error("File reading error:", error);
        setErrorMessage("Failed to read file");
        alert("❌ Failed to read file");
      };
      
      reader.readAsArrayBuffer(file);
    } else {
      setErrorMessage("Unsupported file format. Please upload CSV or XLSX files only.");
      alert("❌ Unsupported file format. Please upload CSV or XLSX files only.");
      e.target.value = "";
    }
  };

  return (
    <div className="px-2 py-6 md:p-8 font-Outfit">
      <div className="flex flex-col mb-6">
        <h2 className="text-2xl font-bold text-title flex items-center gap-2">
          Add New Class
        </h2>
        <p className="text-md font-light text-subtext">
          Upload a classlist to create a new class ({classCount}/{MAX_CLASSES} classes)
        </p>
      </div>

      {/* Class Limit Warning */}
      {isLimitReached && (
        <div className="mb-6 p-4 bg-orange-50 border-2 border-orange-200 rounded-xl flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-orange-600 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-orange-800 font-semibold">Class Limit Reached</p>
            <p className="text-orange-700 text-sm mt-1">
              You have reached the maximum limit of {MAX_CLASSES} classes. Please delete an existing class before adding a new one.
            </p>
          </div>
        </div>
      )}

      {/* Near Limit Warning */}
      {!isLimitReached && classCount >= MAX_CLASSES - 2 && (
        <div className="mb-6 p-4 bg-yellow-50 border-2 border-yellow-200 rounded-xl flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-yellow-800 font-semibold">Approaching Class Limit</p>
            <p className="text-yellow-700 text-sm mt-1">
              You have {classCount} out of {MAX_CLASSES} classes. You can add {MAX_CLASSES - classCount} more class{MAX_CLASSES - classCount !== 1 ? 'es' : ''}.
            </p>
          </div>
        </div>
      )}

      <div className={`border-2 border-dashed rounded-3xl p-10 ${isLimitReached ? 'border-gray-200 bg-gray-50 opacity-60' : 'border-gray-300'}`}>
        <div className="text-center">
          <Upload className={`mx-auto w-10 h-10 mb-3 ${isLimitReached ? 'text-gray-300' : 'text-gray-400'}`} />
          <p className={`mb-3 ${isLimitReached ? 'text-gray-400' : 'text-subtext'}`}>
            {isLimitReached ? 'Class limit reached - Delete a class to add new ones' : 'Upload your classlist (.csv or .xlsx)'}
          </p>
          <p className={`text-sm mb-3 ${isLimitReached ? 'text-gray-400' : 'text-subtext'}`}>
            Required columns: No, Student No., Name, Gender, Program, Year, Email Address, Contact No.
          </p>

          <input
            id="file-upload"
            type="file"
            accept=".csv,.xlsx,.xls"
            onChange={handleFileUpload}
            className="hidden"
            disabled={uploading || isLimitReached}
          />
          
          <label
            htmlFor="file-upload"
            className={`inline-block px-6 py-3 font-semibold rounded-lg transition ${
              uploading || isLimitReached
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-button text-white cursor-pointer hover:bg-buttonHover'
            }`}
          >
            {uploading ? (
              <span className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                Uploading...
              </span>
            ) : isLimitReached ? (
              "Limit Reached"
            ) : (
              "Choose File"
            )}
          </label>

          {fileName && !uploading && !showClassNameModal && (
            <p className="text-sm text-subtext italic mt-3">Selected: {fileName}</p>
          )}

          {uploadProgress && uploading && (
            <p className="text-sm text-accent font-medium mt-3">
              {uploadProgress}
            </p>
          )}
        </div>

        {errorMessage && (
          <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-700 font-semibold text-center">
              ❌ {errorMessage}
            </p>
          </div>
        )}

        {uploadCount > 0 && !uploading && !errorMessage && (
          <div className="flex items-center justify-center mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
            <p className="flex flex-row gap-2 text-base items-center text-accent font-semibold text-center">
              <CircleCheck className="w-4 h-4 text-accent"/> Successfully processed {uploadCount} student(s)!
            </p>
          </div>
        )}
      </div>

      <ClassNameModal
        isOpen={showClassNameModal}
        defaultName={pendingUploadData?.file.name.replace(/\.(csv|xlsx|xls)$/i, '')}
        onConfirm={confirmClassNameAndUpload}
        onCancel={cancelClassNameModal}
      />
    </div>
  );
}